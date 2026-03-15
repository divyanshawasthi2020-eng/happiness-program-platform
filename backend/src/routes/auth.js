// ─── Auth Routes ─────────────────────────────────────────────────────────────
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').trim().notEmpty()
    .matches(/^[A-Z0-9]+$/i).withMessage('Code must be alphanumeric')
    .toUpperCase(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, code } = req.body;

    try {
      // Find or create teacher (code is the unique identifier)
      let teacher = await prisma.teacher.findUnique({ where: { code } });

      if (!teacher) {
        // First login with this code = register
        teacher = await prisma.teacher.create({
          data: { name, code }
        });
        logger.info(`New teacher registered: ${name} [${code}]`);
      } else {
        // Existing teacher — update name if changed
        if (teacher.name !== name) {
          teacher = await prisma.teacher.update({
            where: { id: teacher.id },
            data: { name }
          });
        }
      }

      if (!teacher.isActive) {
        return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
      }

      // Create session
      const token = jwt.sign(
        { teacherId: teacher.id, code: teacher.code },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await prisma.session.create({
        data: { teacherId: teacher.id, token, expiresAt }
      });

      // Clean up old sessions for this teacher (keep last 5)
      const sessions = await prisma.session.findMany({
        where: { teacherId: teacher.id },
        orderBy: { createdAt: 'desc' },
        skip: 5,
      });
      if (sessions.length > 0) {
        await prisma.session.deleteMany({
          where: { id: { in: sessions.map(s => s.id) } }
        });
      }

      res.json({
        token,
        teacher: {
          id: teacher.id,
          name: teacher.name,
          code: teacher.code,
          email: teacher.email,
          city: teacher.city,
          phone: teacher.phone,
          waNumber: teacher.waNumber,
          orgLink: teacher.orgLink,
          role: teacher.role,
        }
      });
    } catch (err) {
      logger.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

// ── POST /api/auth/logout ──────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    await prisma.session.deleteMany({ where: { token } });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  const { id, name, code, email, city, phone, waNumber, orgLink, role } = req.teacher;
  res.json({ id, name, code, email, city, phone, waNumber, orgLink, role });
});

export default router;
