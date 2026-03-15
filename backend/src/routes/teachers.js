// ─── Teacher Routes ───────────────────────────────────────────────────────────
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';
import { emailService } from '../services/email.js';

const router = Router();
router.use(authenticate);

// Update own profile
router.put('/me', async (req, res) => {
  const { name, email, city, phone, waNumber, orgLink } = req.body;
  try {
    const updated = await prisma.teacher.update({
      where: { id: req.teacherId },
      data: {
        name:      name      ?? undefined,
        email:     email     ?? undefined,
        city:      city      ?? undefined,
        phone:     phone     ?? undefined,
        waNumber:  waNumber  ?? undefined,
        orgLink:   orgLink   ?? undefined,
      },
      select: { id:true, name:true, code:true, email:true, city:true, phone:true, waNumber:true, orgLink:true, role:true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// Save SMTP config
router.put('/me/smtp', async (req, res) => {
  const { host, port, secure, user, pass, from } = req.body;
  if (!host || !user || !pass) {
    return res.status(400).json({ error: 'host, user, pass required' });
  }
  try {
    const config = { host, port: parseInt(port||587), secure: !!secure, user, pass, from };
    // Test connection before saving
    await emailService.verify(config);
    await prisma.teacher.update({
      where: { id: req.teacherId },
      data: { smtpConfig: config }
    });
    res.json({ message: 'SMTP saved and verified' });
  } catch (err) {
    res.status(400).json({ error: `SMTP verification failed: ${err.message}` });
  }
});

// Test SMTP
router.post('/me/smtp/test', async (req, res) => {
  const { to } = req.body;
  try {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.teacherId } });
    await emailService.send({
      smtpConfig: teacher.smtpConfig,
      to: to || teacher.email,
      subject: 'HP Platform — Email Test',
      html: '<p>Your email configuration is working correctly! 🎉</p>',
      text: 'Your email configuration is working correctly!',
    });
    res.json({ message: `Test email sent to ${to || teacher.email}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
