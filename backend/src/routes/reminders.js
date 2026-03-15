// ─── Reminder Routes ──────────────────────────────────────────────────────────
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const reminders = await prisma.reminder.findMany({
    where: { teacherId: req.teacherId },
    orderBy: { time: 'asc' },
  });
  res.json(reminders);
});

router.post('/', async (req, res) => {
  const { time, frequency, text } = req.body;
  if (!time || !text) return res.status(400).json({ error: 'time and text required' });
  try {
    const r = await prisma.reminder.create({
      data: { teacherId: req.teacherId, time, frequency: frequency||'DAILY', text }
    });
    res.status(201).json(r);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create reminder' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const r = await prisma.reminder.findFirst({ where: { id: req.params.id, teacherId: req.teacherId } });
    if (!r) return res.status(404).json({ error: 'Not found' });
    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: {
        time:      req.body.time      ?? r.time,
        frequency: req.body.frequency ?? r.frequency,
        text:      req.body.text      ?? r.text,
        isActive:  req.body.isActive  ?? r.isActive,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.reminder.deleteMany({ where: { id: req.params.id, teacherId: req.teacherId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
