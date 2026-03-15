// ─── Course Routes ────────────────────────────────────────────────────────────
import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const courses = await prisma.course.findMany({
    where: { teacherId: req.teacherId, isActive: true },
    orderBy: { courseDate: 'asc' },
    include: { _count: { select: { leads: true } } },
  });
  res.json(courses);
});

router.post('/',
  body('city').trim().notEmpty(),
  body('courseDate').isISO8601().withMessage('Valid date required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const course = await prisma.course.create({
        data: {
          teacherId:  req.teacherId,
          city:       req.body.city,
          courseDate: new Date(req.body.courseDate),
          seats:      parseInt(req.body.seats) || 25,
          venue:      req.body.venue || null,
          notes:      req.body.notes || null,
        }
      });
      res.status(201).json(course);
    } catch (err) {
      res.status(500).json({ error: 'Failed to create course' });
    }
  }
);

router.put('/:id', async (req, res) => {
  try {
    const course = await prisma.course.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!course) return res.status(404).json({ error: 'Course not found' });
    const updated = await prisma.course.update({
      where: { id: req.params.id },
      data: {
        city:       req.body.city       ?? course.city,
        courseDate: req.body.courseDate ? new Date(req.body.courseDate) : course.courseDate,
        seats:      req.body.seats      ? parseInt(req.body.seats) : course.seats,
        venue:      req.body.venue      ?? course.venue,
        notes:      req.body.notes      ?? course.notes,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.course.updateMany({
      where: { id: req.params.id, teacherId: req.teacherId },
      data: { isActive: false }
    });
    res.json({ message: 'Course archived' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

export default router;
