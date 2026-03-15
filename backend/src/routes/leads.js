// ─── Lead Routes ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

// ── GET /api/leads ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const {
    page = 1, limit = 50,
    status, interest, source, courseId,
    search, sortBy = 'createdAt', sortOrder = 'desc'
  } = req.query;

  const where = { teacherId: req.teacherId };
  if (status)   where.status   = status;
  if (interest) where.interest = interest;
  if (source)   where.source   = source;
  if (courseId) where.courseId = courseId;
  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
      { city:  { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: { course: { select: { city: true, courseDate: true } } },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    logger.error('Get leads error:', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// ── GET /api/leads/stats ───────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const tid = req.teacherId;
    const [total, byStatus, bySource, byInterest, recent] = await Promise.all([
      prisma.lead.count({ where: { teacherId: tid } }),
      prisma.lead.groupBy({ by: ['status'],   where: { teacherId: tid }, _count: true }),
      prisma.lead.groupBy({ by: ['source'],   where: { teacherId: tid }, _count: true }),
      prisma.lead.groupBy({ by: ['interest'], where: { teacherId: tid }, _count: true }),
      prisma.lead.count({
        where: { teacherId: tid, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }
      }),
    ]);
    res.json({ total, byStatus, bySource, byInterest, recentWeek: recent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ── POST /api/leads ────────────────────────────────────────────────────────
router.post('/',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().withMessage('Invalid email'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const lead = await prisma.lead.create({
        data: {
          teacherId: req.teacherId,
          name:      req.body.name,
          phone:     req.body.phone     || null,
          email:     req.body.email     || null,
          city:      req.body.city      || null,
          source:    req.body.source    || 'WHATSAPP',
          interest:  req.body.interest  || 'WARM',
          status:    req.body.status    || 'NEW',
          courseId:  req.body.courseId  || null,
          notes:     req.body.notes     || null,
        }
      });
      res.status(201).json(lead);
    } catch (err) {
      logger.error('Create lead error:', err);
      res.status(500).json({ error: 'Failed to create lead' });
    }
  }
);

// ── PUT /api/leads/:id ─────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const updated = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        name:     req.body.name     ?? lead.name,
        phone:    req.body.phone    ?? lead.phone,
        email:    req.body.email    ?? lead.email,
        city:     req.body.city     ?? lead.city,
        source:   req.body.source   ?? lead.source,
        interest: req.body.interest ?? lead.interest,
        status:   req.body.status   ?? lead.status,
        courseId: req.body.courseId !== undefined ? req.body.courseId : lead.courseId,
        notes:    req.body.notes    ?? lead.notes,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// ── DELETE /api/leads/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

// ── POST /api/leads/bulk-import ────────────────────────────────────────────
router.post('/bulk-import', async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) {
    return res.status(400).json({ error: 'No leads provided' });
  }

  try {
    // Deduplicate by phone within this teacher's existing leads
    const phones = leads.map(l => l.phone).filter(Boolean);
    const existing = await prisma.lead.findMany({
      where: { teacherId: req.teacherId, phone: { in: phones } },
      select: { phone: true }
    });
    const existingPhones = new Set(existing.map(e => e.phone));

    const toInsert = leads.filter(l => !l.phone || !existingPhones.has(l.phone)).map(l => ({
      teacherId:  req.teacherId,
      name:       l.name     || 'Unknown',
      phone:      l.phone    || null,
      email:      l.email    || null,
      city:       l.city     || null,
      source:     normaliseEnum(l.source, VALID_SOURCES, 'IMPORT'),
      interest:   normaliseEnum(l.interest, VALID_INTERESTS, 'WARM'),
      status:     normaliseEnum(l.status, VALID_STATUSES, 'NEW'),
      importedAt: new Date(),
    }));

    if (toInsert.length === 0) {
      return res.json({ inserted: 0, skipped: leads.length, message: 'All leads already exist (duplicate phones)' });
    }

    await prisma.lead.createMany({ data: toInsert });
    res.json({ inserted: toInsert.length, skipped: leads.length - toInsert.length });
  } catch (err) {
    logger.error('Bulk import error:', err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
});

// ── POST /api/leads/bulk-delete ────────────────────────────────────────────
router.post('/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
  try {
    const { count } = await prisma.lead.deleteMany({
      where: { id: { in: ids }, teacherId: req.teacherId }
    });
    res.json({ deleted: count });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
const VALID_SOURCES   = ['INSTAGRAM','WHATSAPP','GOOGLE_FORM','REFERRAL','OFFLINE','IMPORT','WEBSITE'];
const VALID_INTERESTS = ['HOT','WARM','COLD'];
const VALID_STATUSES  = ['NEW','CONTACTED','REGISTERED','COMPLETED','DROPPED'];

function normaliseEnum(val, valid, fallback) {
  if (!val) return fallback;
  const up = val.toUpperCase().replace(/\s+/g, '_');
  return valid.includes(up) ? up : fallback;
}

export default router;
