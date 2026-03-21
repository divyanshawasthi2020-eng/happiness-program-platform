import jwt from 'jsonwebtoken';
import { prisma } from '../utils/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT signature
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate session exists and is not expired
    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!session) {
      return res.status(401).json({ error: 'Session expired or invalid' });
    }

    // Load teacher
    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.teacherId },
    });
    if (!teacher) {
      return res.status(401).json({ error: 'Teacher not found' });
    }
    if (!teacher.isActive) {
      return res.status(403).json({ error: 'Account is inactive. Contact admin.' });
    }

    req.teacher = teacher;
    req.teacherId = teacher.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.teacher || req.teacher.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
