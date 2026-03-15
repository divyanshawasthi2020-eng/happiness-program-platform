// ─── Cron Scheduler ──────────────────────────────────────────────────────────
// Runs background jobs for:
//   - Reminder notifications (daily/weekly)
//   - Scheduled campaign dispatch
//   - Session cleanup
//
// Uses node-cron (no Redis required).
// ─────────────────────────────────────────────────────────────────────────────
import cron from 'node-cron';
import { prisma } from '../utils/db.js';
import { emailService } from '../services/email.js';
import { buildMessage } from '../utils/templateEngine.js';
import { logger } from '../utils/logger.js';

export function startScheduler() {
  logger.info('⏰ Starting cron scheduler...');

  // ── Every minute: check reminders ─────────────────────────────────────────
  cron.schedule('* * * * *', async () => {
    const now     = new Date();
    const hh      = String(now.getHours()).padStart(2, '0');
    const mm      = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    const today   = now.toISOString().slice(0, 10);
    const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed

    try {
      const dueReminders = await prisma.reminder.findMany({
        where: {
          time: timeStr,
          isActive: true,
          OR: [
            { frequency: 'DAILY' },
            { frequency: 'ONCE',   lastRun: null },
            { frequency: 'WEEKLY', lastRun: { lt: new Date(today) } },
          ],
        },
        include: { teacher: true },
      });

      for (const reminder of dueReminders) {
        logger.info(`Running reminder [${reminder.id}] for teacher ${reminder.teacher.name}: "${reminder.text.slice(0, 50)}"`);

        // Mark as run
        await prisma.reminder.update({
          where: { id: reminder.id },
          data: {
            lastRun: now,
            // Disable ONCE reminders after firing
            ...(reminder.frequency === 'ONCE' ? { isActive: false } : {}),
          },
        });

        // If teacher has email set up, send reminder email
        if (reminder.teacher.email) {
          try {
            await emailService.send({
              smtpConfig: reminder.teacher.smtpConfig,
              to: reminder.teacher.email,
              subject: `HP Platform Reminder: ${reminder.text.slice(0, 60)}`,
              html: `<p><strong>Reminder (${reminder.frequency}):</strong></p><p>${reminder.text}</p><hr><p style="color:#888;font-size:12px">Sent by Happiness Program Platform · ${new Date().toLocaleString('en-IN')}</p>`,
              text: reminder.text,
            });
          } catch (err) {
            logger.warn(`Reminder email failed for ${reminder.teacher.email}: ${err.message}`);
          }
        }
      }
    } catch (err) {
      logger.error('Reminder cron error:', err.message);
    }
  });

  // ── Every 5 minutes: dispatch scheduled campaigns ─────────────────────────
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    try {
      const due = await prisma.campaign.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: now },
        },
        include: {
          template: true,
          course:   true,
          teacher:  true,
        },
      });

      for (const campaign of due) {
        logger.info(`Dispatching scheduled campaign [${campaign.id}]: ${campaign.name}`);
        await dispatchCampaign(campaign);
      }
    } catch (err) {
      logger.error('Scheduled campaign cron error:', err.message);
    }
  });

  // ── Daily at 3 AM: clean expired sessions ─────────────────────────────────
  cron.schedule('0 3 * * *', async () => {
    try {
      const { count } = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      if (count > 0) logger.info(`Cleaned ${count} expired sessions`);
    } catch (err) {
      logger.error('Session cleanup error:', err.message);
    }
  });

  // ── Daily at 3:05 AM: pre-course reminder auto-broadcasts ─────────────────
  // Automatically sends reminder emails 7 days and 1 day before each course
  cron.schedule('5 3 * * *', async () => {
    try {
      const today = new Date();
      const in7   = new Date(today); in7.setDate(today.getDate() + 7);
      const in1   = new Date(today); in1.setDate(today.getDate() + 1);

      // Find courses exactly 7 or 1 days away
      const upcomingCourses = await prisma.course.findMany({
        where: {
          isActive: true,
          courseDate: {
            gte: new Date(in1.toDateString()),
            lte: new Date(in7.toDateString() + 'T23:59:59'),
          },
        },
        include: { teacher: true },
      });

      for (const course of upcomingCourses) {
        const daysLeft = Math.round((new Date(course.courseDate) - today) / 86400000);
        if (daysLeft !== 7 && daysLeft !== 1) continue;

        const leads = await prisma.lead.findMany({
          where: {
            courseId: course.id,
            status: { in: ['CONTACTED', 'REGISTERED'] },
            email: { not: null },
          },
        });

        if (leads.length === 0) continue;

        const subject = daysLeft === 7
          ? `Reminder: Happiness Program in ${course.city} — 7 days away!`
          : `Tomorrow! Happiness Program in ${course.city}`;

        const body = daysLeft === 7
          ? `Dear {Name},\n\nJust a reminder — the Happiness Program in ${course.city} is just 7 days away on ${new Date(course.courseDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}.\n\nRegister: ${course.teacher.orgLink || 'https://www.artofliving.org'}\n\nWarm regards,\n${course.teacher.name}`
          : `Dear {Name},\n\nThe Happiness Program in ${course.city} starts TOMORROW! We're excited to see you.\n\nPlease arrive 15 minutes early. Wear comfortable clothes and bring water.\n\nSee you there!\n${course.teacher.name}`;

        for (const lead of leads) {
          try {
            await emailService.send({
              smtpConfig: course.teacher.smtpConfig,
              to: lead.email,
              subject,
              text: buildMessage(body, { Name: lead.name.split(' ')[0] }),
              html: buildMessage(body, { Name: lead.name.split(' ')[0] }).replace(/\n/g, '<br>'),
            });
            await new Promise(r => setTimeout(r, 500)); // 0.5s between emails
          } catch (err) {
            logger.warn(`Auto-reminder email failed for ${lead.email}: ${err.message}`);
          }
        }

        logger.info(`Auto-sent ${daysLeft}-day reminder to ${leads.length} leads for ${course.city}`);
      }
    } catch (err) {
      logger.error('Pre-course reminder cron error:', err.message);
    }
  });

  logger.info('✅ Cron scheduler running');
}

// ─── Campaign dispatch ────────────────────────────────────────────────────────
async function dispatchCampaign(campaign) {
  try {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', startedAt: new Date() },
    });

    const where = { teacherId: campaign.teacherId };
    if (campaign.courseId)      where.courseId = campaign.courseId;
    if (campaign.filterStatus)  where.status   = campaign.filterStatus;
    if (campaign.filterInterest) where.interest = campaign.filterInterest;

    const leads = await prisma.lead.findMany({ where });

    if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
      // Import here to avoid circular deps
      const { emailService } = await import('../services/email.js');
      const dateStr = campaign.course
        ? new Date(campaign.course.courseDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
        : '';

      let sent = 0, failed = 0;
      const emailLeads = leads.filter(l => l.email);

      for (const lead of emailLeads) {
        const body = buildMessage(campaign.template.body, {
          Name:        lead.name.split(' ')[0],
          City:        lead.city || campaign.teacher.city || '',
          CourseDate:  dateStr,
          TeacherName: campaign.teacher.name,
          OrgLink:     campaign.teacher.orgLink || '',
        });

        try {
          await emailService.send({
            smtpConfig: campaign.teacher.smtpConfig,
            to:      lead.email,
            subject: campaign.template.subject || `Happiness Program — ${campaign.teacher.name}`,
            html:    body.replace(/\n/g, '<br>'),
            text:    body,
          });
          sent++;
          await prisma.messageLog.create({
            data: { campaignId: campaign.id, leadId: lead.id, channel: 'EMAIL', status: 'SENT', sentAt: new Date() }
          });
        } catch (err) {
          failed++;
          await prisma.messageLog.create({
            data: { campaignId: campaign.id, leadId: lead.id, channel: 'EMAIL', status: 'FAILED', errorMsg: err.message }
          });
        }
        await new Promise(r => setTimeout(r, campaign.delayMs || 3000));
      }

      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'COMPLETED', completedAt: new Date(), sentCount: sent, failedCount: failed },
      });

      logger.info(`Scheduled campaign [${campaign.id}] complete: ${sent} sent, ${failed} failed`);
    }

    // WhatsApp scheduled campaigns: mark as ready for browser pickup
    // (can't auto-open browser tabs server-side)
    if (campaign.channel === 'WHATSAPP') {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'DRAFT', scheduledAt: null },
      });
      logger.info(`WhatsApp campaign [${campaign.id}] moved to DRAFT — open dashboard to send`);
    }

  } catch (err) {
    logger.error(`Campaign dispatch [${campaign.id}] failed: ${err.message}`);
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'FAILED' },
    }).catch(() => {});
  }
}
