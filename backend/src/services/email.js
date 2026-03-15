// ─── Email Service ────────────────────────────────────────────────────────────
// Supports:
//   1. Per-teacher SMTP config (saved in teacher.smtpConfig)
//   2. Global SMTP from .env (fallback)
//   3. Gmail (smtp.gmail.com + App Password — free)
//   4. Brevo/Sendinblue (free 300 emails/day)
//   5. Mailgun, AWS SES (paid but cheap)
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

// Global transporter from env (used if teacher has no custom SMTP)
let globalTransporter = null;

function createTransporter(config) {
  return nodemailer.createTransport({
    host:   config.host   || process.env.SMTP_HOST,
    port:   parseInt(config.port  || process.env.SMTP_PORT || 587),
    secure: config.secure === true || process.env.SMTP_SECURE === 'true',
    auth: {
      user: config.user || process.env.SMTP_USER,
      pass: config.pass || process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

function getGlobalTransporter() {
  if (!globalTransporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
    globalTransporter = createTransporter({});
  }
  return globalTransporter;
}

export const emailService = {
  /**
   * Send a single email
   * @param {object} opts - { smtpConfig, to, subject, html, text, from }
   */
  async send({ smtpConfig, to, subject, html, text, from }) {
    const transporter = smtpConfig
      ? createTransporter(smtpConfig)
      : getGlobalTransporter();

    if (!transporter) {
      throw new Error('No SMTP configuration found. Set SMTP_* env vars or teacher SMTP settings.');
    }

    const fromAddr = from
      || (smtpConfig?.from)
      || process.env.SMTP_FROM
      || `Happiness Program <${process.env.SMTP_USER}>`;

    const info = await transporter.sendMail({ from: fromAddr, to, subject, html, text });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  },

  /**
   * Verify SMTP credentials
   */
  async verify(smtpConfig) {
    const transporter = createTransporter(smtpConfig);
    await transporter.verify();
    return true;
  },

  /**
   * Build Gmail setup instructions
   */
  gmailSetupInstructions() {
    return [
      '1. Go to myaccount.google.com → Security',
      '2. Enable "2-Step Verification"',
      '3. Go to "App passwords" → Create password for "Mail"',
      '4. Copy the 16-character password',
      '5. Set SMTP_USER=your@gmail.com, SMTP_PASS=<16-char-password>',
      '6. SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_SECURE=false',
    ];
  },

  /**
   * Build Brevo setup instructions (free 300/day)
   */
  brevoSetupInstructions() {
    return [
      '1. Sign up at brevo.com (free — 300 emails/day)',
      '2. Go to Settings → SMTP & API → SMTP',
      '3. Copy SMTP key',
      '4. Set SMTP_HOST=smtp-relay.brevo.com, SMTP_PORT=587',
      '5. SMTP_USER=your@email.com, SMTP_PASS=<smtp-key>',
    ];
  }
};
