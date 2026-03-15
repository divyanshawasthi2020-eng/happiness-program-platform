// ─── Export Routes ────────────────────────────────────────────────────────────
// Teachers can export their leads, campaigns, and message logs to
// CSV or Excel at any time. Full data ownership.
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import XLSX from 'xlsx';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ── GET /api/export/leads.csv ─────────────────────────────────────────────────
router.get('/leads.:format', async (req, res) => {
  const { format } = req.params;
  const { courseId, status, interest, source } = req.query;

  const where = { teacherId: req.teacherId };
  if (courseId)  where.courseId  = courseId;
  if (status)    where.status    = status;
  if (interest)  where.interest  = interest;
  if (source)    where.source    = source;

  try {
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { course: { select: { city: true, courseDate: true } } },
    });

    const rows = leads.map(l => ({
      Name:       l.name,
      Phone:      l.phone      || '',
      Email:      l.email      || '',
      City:       l.city       || '',
      Source:     l.source,
      Interest:   l.interest,
      Status:     l.status,
      Course:     l.course ? `${l.course.city} ${l.course.courseDate?.slice(0,10)}` : '',
      Notes:      l.notes      || '',
      'Added On': l.createdAt.toISOString().slice(0, 10),
    }));

    if (format === 'json') {
      res.setHeader('Content-Disposition', 'attachment; filename="leads.json"');
      res.setHeader('Content-Type', 'application/json');
      return res.json(rows);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-width columns
    ws['!cols'] = Object.keys(rows[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(ws);
      res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    // xlsx default
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="leads.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── GET /api/export/campaigns.xlsx ────────────────────────────────────────────
router.get('/campaigns.:format', async (req, res) => {
  const { format } = req.params;
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { teacherId: req.teacherId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { title: true } },
        course:   { select: { city: true, courseDate: true } },
        logs:     { select: { status: true } },
      },
    });

    const rows = campaigns.map(c => ({
      Name:        c.name,
      Channel:     c.channel,
      Template:    c.template?.title || '',
      Course:      c.course ? `${c.course.city} ${c.course.courseDate?.toISOString().slice(0,10)}` : '',
      Status:      c.status,
      'Total Leads': c.totalLeads,
      Sent:        c.sentCount,
      Failed:      c.failedCount,
      'Delivery %': c.totalLeads > 0 ? `${Math.round(c.sentCount / c.totalLeads * 100)}%` : '0%',
      'Created On': c.createdAt.toISOString().slice(0, 10),
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Campaigns');

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(rows));
      res.setHeader('Content-Disposition', 'attachment; filename="campaigns.csv"');
      res.setHeader('Content-Type', 'text/csv');
      return res.send(csv);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename="campaigns.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ── GET /api/export/full-backup.json ──────────────────────────────────────────
// Full data backup for a teacher
router.get('/full-backup.json', async (req, res) => {
  try {
    const [leads, courses, campaigns, templates, reminders, profile] = await Promise.all([
      prisma.lead.findMany({ where: { teacherId: req.teacherId } }),
      prisma.course.findMany({ where: { teacherId: req.teacherId } }),
      prisma.campaign.findMany({ where: { teacherId: req.teacherId } }),
      prisma.messageTemplate.findMany({ where: { teacherId: req.teacherId } }),
      prisma.reminder.findMany({ where: { teacherId: req.teacherId } }),
      prisma.teacher.findUnique({
        where: { id: req.teacherId },
        select: { id:true, name:true, code:true, email:true, city:true, phone:true, waNumber:true, orgLink:true, role:true, createdAt:true },
      }),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      teacher: profile,
      stats: { leads: leads.length, courses: courses.length, campaigns: campaigns.length },
      leads, courses, campaigns, templates, reminders,
    };

    res.setHeader('Content-Disposition', `attachment; filename="hp_backup_${req.teacher.code}_${new Date().toISOString().slice(0,10)}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: 'Backup failed' });
  }
});

export default router;
