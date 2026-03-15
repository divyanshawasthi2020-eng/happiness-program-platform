// ─── WA-JS Service (Tier 2 WhatsApp — Free Automated Sending) ─────────────────
//
// Uses whatsapp-web.js (open source, MIT license)
// https://github.com/pedroslopez/whatsapp-web.js
//
// Setup:
//   1. npm install whatsapp-web.js qrcode-terminal --prefix backend
//   2. Set WA_MODE=wajs in backend/.env
//   3. Run backend → scan QR code once → session persists
//
// Risk profile:
//   - WhatsApp may detect automation and ban the number
//   - Use delays of 5–10 seconds between messages
//   - Never send more than 100 messages/hour
//   - Use a separate WhatsApp number, not your main one
//   - Recommended: use with a SIM bought specifically for this
//
// This file is OPTIONAL. Default mode (wa.me links) works without it.
// ─────────────────────────────────────────────────────────────────────────────
import { logger } from '../utils/logger.js';

let client       = null;
let isReady      = false;
let qrCodeData   = null;
let initPromise  = null;

export const waJsService = {

  /**
   * Initialise the WA-JS client. Call once on server start.
   * Resolves when QR is scanned and session is established.
   */
  async init() {
    if (process.env.WA_MODE !== 'wajs') return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        const { Client, LocalAuth } = await import('whatsapp-web.js');
        const qrcode = await import('qrcode-terminal');

        client = new Client({
          authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
          puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
          },
        });

        client.on('qr', (qr) => {
          qrCodeData = qr;
          qrcode.generate(qr, { small: true });
          logger.info('📱 WA-JS: Scan the QR code above with your WhatsApp');
        });

        client.on('authenticated', () => {
          qrCodeData = null;
          logger.info('✅ WA-JS: Authenticated');
        });

        client.on('ready', () => {
          isReady = true;
          logger.info('✅ WA-JS: Client ready — automated sending enabled');
        });

        client.on('disconnected', (reason) => {
          isReady = false;
          logger.warn(`⚠️  WA-JS disconnected: ${reason}`);
        });

        await client.initialize();
      } catch (err) {
        logger.warn(`WA-JS init failed: ${err.message}. Falling back to wa.me links.`);
      }
    })();

    return initPromise;
  },

  /** Current QR code string (base64) for frontend display */
  getQR() { return qrCodeData; },

  /** Whether client is ready to send */
  isReady() { return isReady; },

  /**
   * Send a single WhatsApp message
   * @param {string} phone - E.164 format e.g. "919876543210"
   * @param {string} message - Message text
   */
  async send(phone, message) {
    if (!isReady || !client) {
      throw new Error('WA-JS client not ready. Use wa.me links instead.');
    }

    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;

    // Check number is registered on WhatsApp
    const isRegistered = await client.isRegisteredUser(chatId);
    if (!isRegistered) {
      throw new Error(`${phone} is not registered on WhatsApp`);
    }

    await client.sendMessage(chatId, message);
    return { success: true, phone };
  },

  /**
   * Send to multiple numbers with delay
   * @param {Array<{phone, message}>} items
   * @param {number} delayMs - Delay between messages (min 3000)
   * @param {Function} onProgress - Called after each send: (sent, total, item)
   */
  async sendBulk(items, delayMs = 5000, onProgress) {
    const safeDelay = Math.max(3000, delayMs);
    const results   = { sent: 0, failed: 0, errors: [] };

    for (let i = 0; i < items.length; i++) {
      const { phone, message, leadId } = items[i];
      try {
        await this.send(phone, message);
        results.sent++;
        if (onProgress) onProgress(results.sent, items.length, { leadId, phone, status: 'SENT' });
      } catch (err) {
        results.failed++;
        results.errors.push({ phone, error: err.message });
        if (onProgress) onProgress(i + 1, items.length, { leadId, phone, status: 'FAILED', error: err.message });
      }

      // Always wait between messages — even on failure
      if (i < items.length - 1) {
        await new Promise(r => setTimeout(r, safeDelay));
      }
    }

    return results;
  },

  /** Graceful shutdown */
  async destroy() {
    if (client) {
      await client.destroy();
      client  = null;
      isReady = false;
    }
  },
};
