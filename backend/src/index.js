// ─── Happiness Program Platform — Backend Server ─────────────────────────────
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import 'dotenv/config';

import { logger } from './utils/logger.js';
import { connectDB } from './utils/db.js';
import { initQueues } from './queues/index.js';
import { startScheduler } from './jobs/scheduler.js';
import { waJsService } from './services/wajs.js';
import { validateEnv } from './utils/validateEnv.js';

validateEnv();

import authRoutes       from './routes/auth.js';
import teacherRoutes    from './routes/teachers.js';
import leadRoutes       from './routes/leads.js';
import courseRoutes     from './routes/courses.js';
import campaignRoutes   from './routes/campaigns.js';
import templateRoutes   from './routes/templates.js';
import reminderRoutes   from './routes/reminders.js';
import posterRoutes     from './routes/posters.js';
import uploadRoutes     from './routes/upload.js';
import analyticsRoutes  from './routes/analytics.js';
import exportRoutes     from './routes/export.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many attempts' } }));
app.use('/api', rateLimit({ windowMs: 60*1000, max: 300 }));

app.use('/api/auth',       authRoutes);
app.use('/api/teachers',   teacherRoutes);
app.use('/api/leads',      leadRoutes);
app.use('/api/courses',    courseRoutes);
app.use('/api/campaigns',  campaignRoutes);
app.use('/api/templates',  templateRoutes);
app.use('/api/reminders',  reminderRoutes);
app.use('/api/posters',    posterRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/analytics',  analyticsRoutes);
app.use('/api/export',     exportRoutes);

app.get('/api/wa/qr', (_req, res) => res.json({ qr: waJsService.getQR(), ready: waJsService.isReady() }));
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => { logger.error(err.stack); res.status(err.status||500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message }); });

async function start() {
  try {
    await connectDB();
    await initQueues();
    startScheduler();
    waJsService.init().catch(e => logger.warn('WA-JS skipped:', e.message));
    app.listen(PORT, () => {
      logger.info(`✅ HP Platform backend  →  http://localhost:${PORT}`);
      logger.info(`📊 Health check         →  http://localhost:${PORT}/health`);
    });
  } catch (err) {
    logger.error('Failed to start:', err);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', async () => { await waJsService.destroy(); process.exit(0); });
