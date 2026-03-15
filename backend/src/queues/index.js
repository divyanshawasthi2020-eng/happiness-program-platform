// ─── Queue System ─────────────────────────────────────────────────────────────
// Uses Bull (Redis-backed) when Redis is available.
// Falls back to in-process execution when Redis is not configured.
// ─────────────────────────────────────────────────────────────────────────────
import { logger } from '../utils/logger.js';

let campaignQueue = null;
let reminderQueue = null;

export async function initQueues() {
  if (!process.env.REDIS_URL) {
    logger.warn('⚠️  REDIS_URL not set — job queues disabled (campaigns run inline)');
    return;
  }

  try {
    const Bull = (await import('bull')).default;

    campaignQueue = new Bull('campaigns', process.env.REDIS_URL);
    reminderQueue = new Bull('reminders', process.env.REDIS_URL);

    campaignQueue.process(async (job) => {
      const { runScheduledCampaign } = await import('../jobs/campaignJob.js');
      return runScheduledCampaign(job.data);
    });

    reminderQueue.process(async (job) => {
      const { runReminder } = await import('../jobs/reminderJob.js');
      return runReminder(job.data);
    });

    campaignQueue.on('failed', (job, err) => {
      logger.error(`Campaign job ${job.id} failed: ${err.message}`);
    });

    logger.info('✅ Job queues initialised (Redis connected)');
  } catch (err) {
    logger.warn('⚠️  Queue init failed (Redis unavailable) — campaigns run inline');
  }
}

export function getCampaignQueue() { return campaignQueue; }
export function getReminderQueue() { return reminderQueue; }
