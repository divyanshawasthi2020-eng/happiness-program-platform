// ─── Database Connection (Prisma) ─────────────────────────────────────────────
import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [{ emit: 'event', level: 'query' }]
    : ['error'],
});

if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

export async function connectDB() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed:', err.message);
    logger.error('Check DATABASE_URL in .env — is PostgreSQL running?');
    throw err;
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
