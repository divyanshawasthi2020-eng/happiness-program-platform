// ─── Analytics Routes ─────────────────────────────────────────────────────────
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// ── GET /api/analytics/overview ───────────────────────────────────────────────
router.get('/overview', async (req, res) => {
  const tid = req.teacherId;
  try {
    const [
      totalLeads, totalCourses, activeCourses,
      byStatus, bySource, byInterest,
      recentWeek, recentMonth,
      campaignStats,
    ] = await Promise.all([
      prisma.lead.count({ where: { teacherId: tid } }),
      prisma.course.count({ where: { teacherId: tid } }),
      prisma.course.count({ where: { teacherId: tid, isActive: true, courseDate: { gte: new Date() } } }),
      prisma.lead.groupBy({ by: ['status'],   where: { teacherId: tid }, _count: true }),
      prisma.lead.groupBy({ by: ['source'],   where: { teacherId: tid }, _count: true }),
      prisma.lead.groupBy({ by: ['interest'], where: { teacherId: tid }, _count: true }),
      prisma.lead.count({ where: { teacherId: tid, createdAt: { gte: new Date(Date.now() - 7  * 86400000) } } }),
      prisma.lead.count({ where: { teacherId: tid, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } }),
      prisma.campaign.aggregate({ where: { teacherId: tid }, _sum: { sentCount: true, failedCount: true, totalLeads: true }, _count: true }),
    ]);

    const registered = (byStatus.find(s => s.status === 'REGISTERED')?._count || 0)
                     + (byStatus.find(s => s.status === 'COMPLETED')?._count  || 0);
    const conversionRate = totalLeads > 0 ? Math.round(registered / totalLeads * 100) : 0;

    res.json({
      totalLeads, totalCourses, activeCourses,
      registered, conversionRate,
      recentWeek, recentMonth,
      byStatus, bySource, byInterest,
      campaigns: {
        total:   campaignStats._count,
        sent:    campaignStats._sum.sentCount    || 0,
        failed:  campaignStats._sum.failedCount  || 0,
        reached: campaignStats._sum.totalLeads   || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Analytics fetch failed' });
  }
});

// ── GET /api/analytics/leads-over-time ────────────────────────────────────────
// Returns weekly lead counts for the last 12 weeks
router.get('/leads-over-time', async (req, res) => {
  const tid = req.teacherId;
  const weeks = 12;
  try {
    const results = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(Date.now() - (i + 1) * 7 * 86400000);
      const end   = new Date(Date.now() - i       * 7 * 86400000);
      const count = await prisma.lead.count({
        where: { teacherId: tid, createdAt: { gte: start, lt: end } },
      });
      const label = `W-${i === 0 ? 'now' : i}`;
      results.push({ label, count, weekStart: start.toISOString().slice(0, 10) });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/analytics/course/:id ─────────────────────────────────────────────
router.get('/course/:id', async (req, res) => {
  const tid = req.teacherId;
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, teacherId: tid },
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const leads  = await prisma.lead.findMany({ where: { teacherId: tid, courseId: course.id } });
    const total  = leads.length;
    const reg    = leads.filter(l => l.status === 'REGISTERED' || l.status === 'COMPLETED').length;
    const fill   = Math.round(reg / course.seats * 100);

    const byStatus   = Object.entries(leads.reduce((a, l) => { a[l.status]   = (a[l.status]   || 0) + 1; return a; }, {}));
    const bySource   = Object.entries(leads.reduce((a, l) => { a[l.source]   = (a[l.source]   || 0) + 1; return a; }, {}));
    const byInterest = Object.entries(leads.reduce((a, l) => { a[l.interest] = (a[l.interest] || 0) + 1; return a; }, {}));

    const campaigns = await prisma.campaign.findMany({
      where: { teacherId: tid, courseId: course.id },
      select: { name: true, channel: true, status: true, sentCount: true, totalLeads: true },
    });

    res.json({ course, total, registered: reg, fillPercent: fill, byStatus, bySource, byInterest, campaigns });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── GET /api/analytics/campaigns ──────────────────────────────────────────────
router.get('/campaigns', async (req, res) => {
  const tid = req.teacherId;
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { teacherId: tid },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { template: { select: { title: true } }, course: { select: { city: true } } },
    });

    const stats = campaigns.map(c => ({
      id:        c.id,
      name:      c.name,
      channel:   c.channel,
      status:    c.status,
      template:  c.template?.title,
      course:    c.course?.city,
      sent:      c.sentCount,
      failed:    c.failedCount,
      total:     c.totalLeads,
      openRate:  c.totalLeads > 0 ? Math.round(c.sentCount / c.totalLeads * 100) : 0,
      createdAt: c.createdAt,
    }));

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
