// ─── Message Templates Routes ─────────────────────────────────────────────────
// Templates can be:
//   - Teacher-owned (teacherId set, isShared=false): private
//   - Teacher-owned + shared (isShared=true): visible to all
//   - Global (teacherId=null): built-in defaults
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { previewTemplate } from '../utils/templateEngine.js';

const router = Router();
router.use(authenticate);

// ── GET /api/templates ─────────────────────────────────────────────────────
// Returns: teacher's own + shared + global templates
router.get('/', async (req, res) => {
  try {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        OR: [
          { teacherId: req.teacherId },           // own
          { isShared: true },                      // shared by others
          { teacherId: null },                     // global defaults
        ],
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        teacher: { select: { name: true, code: true } }
      }
    });

    // Tag ownership
    const tagged = templates.map(t => ({
      ...t,
      isOwn: t.teacherId === req.teacherId,
      isGlobal: t.teacherId === null,
    }));

    res.json(tagged);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ── POST /api/templates ────────────────────────────────────────────────────
router.post('/',
  body('title').trim().notEmpty(),
  body('body').trim().notEmpty(),
  body('channel').isIn(['WHATSAPP','EMAIL','BOTH']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const tmpl = await prisma.messageTemplate.create({
        data: {
          teacherId:  req.teacherId,
          title:      req.body.title,
          body:       req.body.body,
          channel:    req.body.channel,
          subject:    req.body.subject    || null,
          category:   req.body.category   || 'NURTURE',
          isShared:   req.body.isShared   || false,
          sortOrder:  req.body.sortOrder  || 0,
        }
      });
      res.status(201).json(tmpl);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create template' });
    }
  }
);

// ── PUT /api/templates/:id ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const tmpl = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!tmpl) return res.status(404).json({ error: 'Template not found or not owned by you' });

    const updated = await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: {
        title:    req.body.title    ?? tmpl.title,
        body:     req.body.body     ?? tmpl.body,
        subject:  req.body.subject  ?? tmpl.subject,
        channel:  req.body.channel  ?? tmpl.channel,
        category: req.body.category ?? tmpl.category,
        isShared: req.body.isShared ?? tmpl.isShared,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// ── DELETE /api/templates/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const tmpl = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!tmpl) return res.status(404).json({ error: 'Not found or not owned by you' });

    // Soft delete (in case campaigns reference it)
    await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ message: 'Template removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// ── POST /api/templates/:id/preview ───────────────────────────────────────
router.post('/:id/preview', async (req, res) => {
  try {
    const tmpl = await prisma.messageTemplate.findFirst({
      where: {
        id: req.params.id,
        OR: [{ teacherId: req.teacherId }, { isShared: true }, { teacherId: null }]
      }
    });
    if (!tmpl) return res.status(404).json({ error: 'Not found' });

    const preview = previewTemplate(tmpl.body, req.teacher.name);
    res.json({ preview, body: tmpl.body });
  } catch (err) {
    res.status(500).json({ error: 'Preview failed' });
  }
});

export default router;
