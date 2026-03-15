// ─── Auth Middleware ──────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate session still exists in DB
    const session = await prisma.session.findUnique({
      where: { token },
      include: { teacher: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }

    if (!session.teacher.isActive) {
      return res.status(403).json({ error: 'Account is inactive.' });
    }

    req.teacher = session.teacher;
    req.teacherId = session.teacher.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.teacher?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
