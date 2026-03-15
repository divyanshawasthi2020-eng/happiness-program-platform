// ─── Campaign Routes ──────────────────────────────────────────────────────────
// WhatsApp Strategy:
//   FREE:  wa.me links (no API, no ban risk, one-by-one with UI click)
//   FREE:  WA-JS library (requires one-time QR scan, open source)
//   PAID:  Interakt / WATI (official API, bulk, ₹999–2500/mo)
//
// This module uses wa.me links by default (zero cost, zero ban risk).
// Set WA_MODE=wajs in .env for automated sending via WA-JS.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { emailService } from '../services/email.js';
import { buildMessage } from '../utils/templateEngine.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

// ── GET /api/campaigns ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { teacherId: req.teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { title: true, channel: true } },
        course:   { select: { city: true, courseDate: true } },
      },
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// ── POST /api/campaigns ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, templateId, courseId, channel, filterStatus, filterInterest, delayMs, scheduledAt } = req.body;
  if (!name || !templateId || !channel) {
    return res.status(400).json({ error: 'name, templateId, channel required' });
  }

  try {
    // Count matching leads
    const where = buildLeadFilter(req.teacherId, courseId, filterStatus, filterInterest);
    const totalLeads = await prisma.lead.count({ where });

    const campaign = await prisma.campaign.create({
      data: {
        teacherId: req.teacherId,
        name, templateId, courseId: courseId || null,
        channel,
        totalLeads,
        delayMs: delayMs || 3000,
        filterStatus: filterStatus || null,
        filterInterest: filterInterest || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      }
    });
    res.status(201).json(campaign);
  } catch (err) {
    logger.error('Create campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ── POST /api/campaigns/:id/start ─────────────────────────────────────────
// For EMAIL campaigns: sends actual emails server-side
// For WHATSAPP campaigns: returns wa.me links for browser-side opening
router.post('/:id/start', async (req, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId },
      include: { template: true, course: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'RUNNING') return res.status(400).json({ error: 'Campaign already running' });

    const teacher = req.teacher;
    const where = buildLeadFilter(
      req.teacherId,
      campaign.courseId,
      campaign.filterStatus,
      campaign.filterInterest
    );
    const leads = await prisma.lead.findMany({ where });

    if (leads.length === 0) {
      return res.status(400).json({ error: 'No leads match the campaign filters' });
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'RUNNING', startedAt: new Date(), totalLeads: leads.length }
    });

    if (campaign.channel === 'EMAIL' || campaign.channel === 'BOTH') {
      // Run email sends server-side (async)
      runEmailCampaign(campaign, leads, teacher).catch(err =>
        logger.error('Email campaign error:', err)
      );
    }

    if (campaign.channel === 'WHATSAPP' || campaign.channel === 'BOTH') {
      // Build wa.me links and return to frontend
      // Frontend opens each link with a delay
      const waLinks = leads
        .filter(l => l.phone)
        .map(l => {
          const msg = buildMessage(campaign.template.body, {
            Name:        l.name,
            City:        l.city || teacher.city || '',
            CourseDate:  campaign.course ? formatDate(campaign.course.courseDate) : '',
            TeacherName: teacher.name,
            OrgLink:     teacher.orgLink || '',
          });
          const phone = normalisePhone(l.phone);
          return {
            leadId: l.id,
            name:   l.name,
            phone,
            url:    `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
            msg,
          };
        });

      return res.json({
        type: 'whatsapp_links',
        campaignId: campaign.id,
        delayMs: campaign.delayMs,
        links: waLinks,
        emailStarted: campaign.channel === 'BOTH',
      });
    }

    res.json({ type: 'email_started', campaignId: campaign.id, totalLeads: leads.length });
  } catch (err) {
    logger.error('Start campaign error:', err);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// ── POST /api/campaigns/:id/log-sent ──────────────────────────────────────
// Frontend calls this after successfully opening each WA link
router.post('/:id/log-sent', async (req, res) => {
  const { leadId, status = 'SENT' } = req.body;
  try {
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!campaign) return res.status(404).json({ error: 'Not found' });

    await prisma.messageLog.upsert({
      where: { id: `${req.params.id}_${leadId}` },
      create: {
        id: `${req.params.id}_${leadId}`,
        campaignId: req.params.id,
        leadId, channel: campaign.channel,
        status, sentAt: new Date(),
      },
      update: { status, sentAt: new Date() }
    });

    const sentCount = await prisma.messageLog.count({
      where: { campaignId: req.params.id, status: 'SENT' }
    });

    if (sentCount >= campaign.totalLeads) {
      await prisma.campaign.update({
        where: { id: req.params.id },
        data: { status: 'COMPLETED', completedAt: new Date(), sentCount }
      });
    } else {
      await prisma.campaign.update({
        where: { id: req.params.id },
        data: { sentCount }
      });
    }

    res.json({ ok: true, sentCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log' });
  }
});

// ── POST /api/campaigns/:id/pause ─────────────────────────────────────────
router.post('/:id/pause', async (req, res) => {
  try {
    const c = await prisma.campaign.findFirst({ where: { id: req.params.id, teacherId: req.teacherId } });
    if (!c) return res.status(404).json({ error: 'Not found' });
    await prisma.campaign.update({ where: { id: req.params.id }, data: { status: 'PAUSED' } });
    res.json({ status: 'PAUSED' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to pause' });
  }
});

// ── DELETE /api/campaigns/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.campaign.deleteMany({ where: { id: req.params.id, teacherId: req.teacherId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────
function buildLeadFilter(teacherId, courseId, filterStatus, filterInterest) {
  const where = { teacherId };
  if (courseId) where.courseId = courseId;
  if (filterStatus)   where.status   = filterStatus;
  if (filterInterest) where.interest = filterInterest;
  return where;
}

function normalisePhone(phone) {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.startsWith('91') ? digits : '91' + digits;
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function runEmailCampaign(campaign, leads, teacher) {
  const emailLeads = leads.filter(l => l.email);
  let sent = 0;
  let failed = 0;

  for (const lead of emailLeads) {
    const body = buildMessage(campaign.template.body, {
      Name:        lead.name,
      City:        lead.city || teacher.city || '',
      CourseDate:  campaign.course ? formatDate(campaign.course.courseDate) : '',
      TeacherName: teacher.name,
      OrgLink:     teacher.orgLink || '',
    });

    try {
      await emailService.send({
        smtpConfig: teacher.smtpConfig,
        to:      lead.email,
        subject: campaign.template.subject || `Happiness Program — ${teacher.name}`,
        html:    body.replace(/\n/g, '<br>'),
        text:    body,
      });
      sent++;
      await prisma.messageLog.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          channel: 'EMAIL',
          status: 'SENT',
          sentAt: new Date(),
          messageBody: body.slice(0, 500),
        }
      });
    } catch (err) {
      failed++;
      logger.warn(`Email failed for ${lead.email}: ${err.message}`);
      await prisma.messageLog.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          channel: 'EMAIL',
          status: 'FAILED',
          errorMsg: err.message,
        }
      });
    }

    // Delay between emails (avoid spam filters)
    await new Promise(r => setTimeout(r, campaign.delayMs));
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      sentCount: sent,
      failedCount: failed,
    }
  });

  logger.info(`Email campaign ${campaign.id} complete: ${sent} sent, ${failed} failed`);
}

export default router;
