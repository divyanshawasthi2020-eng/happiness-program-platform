// ─── Poster Module ────────────────────────────────────────────────────────────
// Two modes:
//   1. Canva Connect (free API) — opens teacher's Canva with pre-filled text
//   2. Built-in HTML templates — generate posters in-browser, export to PNG/JPG
//
// Canva API: https://www.canva.com/developers/
//   - Free developer account
//   - Autofill API lets you pre-fill template text via URL parameters
//   - Teacher authorises once via OAuth, then all poster edits open in Canva
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Built-in poster template definitions
// These reference Canva template IDs and our local SVG preview templates
export const POSTER_TEMPLATES = [
  {
    key: 'classic_gold',
    name: 'Classic Gold',
    description: 'Clean gold & white — works for WhatsApp and Instagram',
    canvaTemplateId: null, // Set after creating Canva template
    aspectRatio: '1:1',
    format: 'square',
    fields: ['city', 'courseDate', 'teacherName', 'venue', 'time'],
  },
  {
    key: 'sunset_calm',
    name: 'Sunset Calm',
    description: 'Warm gradient — ideal for Instagram stories',
    canvaTemplateId: null,
    aspectRatio: '9:16',
    format: 'story',
    fields: ['city', 'courseDate', 'teacherName', 'tagline'],
  },
  {
    key: 'minimal_white',
    name: 'Minimal White',
    description: 'Clean typography — corporate/formal events',
    canvaTemplateId: null,
    aspectRatio: '1:1',
    format: 'square',
    fields: ['city', 'courseDate', 'teacherName', 'venue'],
  },
  {
    key: 'nature_green',
    name: 'Nature & Peace',
    description: 'Natural tones — wellness & yoga audience',
    canvaTemplateId: null,
    aspectRatio: '4:5',
    format: 'portrait',
    fields: ['city', 'courseDate', 'teacherName', 'tagline'],
  },
];

// ── GET /api/posters/templates ─────────────────────────────────────────────
router.get('/templates', (req, res) => {
  res.json(POSTER_TEMPLATES);
});

// ── GET /api/posters ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const posters = await prisma.poster.findMany({
      where: { teacherId: req.teacherId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(posters);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch posters' });
  }
});

// ── POST /api/posters ──────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { templateKey, city, courseDate, teacherName, data } = req.body;
  if (!templateKey) return res.status(400).json({ error: 'templateKey required' });

  try {
    const poster = await prisma.poster.create({
      data: {
        teacherId:   req.teacherId,
        templateKey,
        title:       `${city || 'My City'} — ${courseDate || 'TBD'}`,
        city:        city || null,
        courseDate:  courseDate || null,
        teacherName: teacherName || req.teacher.name,
        data:        data || {},
      }
    });
    res.status(201).json(poster);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create poster' });
  }
});

// ── GET /api/posters/canva-auth-url ───────────────────────────────────────
// Generate Canva OAuth URL for teacher to authorise
router.get('/canva-auth-url', (req, res) => {
  const clientId = process.env.CANVA_CLIENT_ID;
  if (!clientId) {
    return res.json({
      available: false,
      message: 'Canva integration not configured. Set CANVA_CLIENT_ID in .env',
      setupUrl: 'https://www.canva.com/developers/',
      instructions: [
        '1. Go to https://www.canva.com/developers/',
        '2. Create a free developer account',
        '3. Create a new integration',
        '4. Copy Client ID and Client Secret to .env',
        '5. Set redirect URI to http://localhost:3001/api/posters/canva-callback',
      ]
    });
  }

  const redirectUri = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/posters/canva-callback`;
  const state = Buffer.from(JSON.stringify({ teacherId: req.teacherId })).toString('base64');
  const url = `https://api.canva.com/rest/v1/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=design:read design:write asset:read asset:write&state=${state}`;

  res.json({ available: true, url });
});

// ── POST /api/posters/:id/open-in-canva ───────────────────────────────────
// If teacher has Canva connected, deep-link them to the design
router.post('/:id/open-in-canva', async (req, res) => {
  const poster = await prisma.poster.findFirst({
    where: { id: req.params.id, teacherId: req.teacherId }
  });
  if (!poster) return res.status(404).json({ error: 'Poster not found' });

  const tmpl = POSTER_TEMPLATES.find(t => t.key === poster.templateKey);

  if (tmpl?.canvaTemplateId) {
    // Deep link to specific Canva template with autofill
    const params = new URLSearchParams({
      'autofill[city]':        poster.city || '',
      'autofill[date]':        poster.courseDate || '',
      'autofill[teacherName]': poster.teacherName || '',
    });
    const canvaUrl = `https://www.canva.com/design/${tmpl.canvaTemplateId}/remix?${params}`;
    await prisma.poster.update({ where: { id: poster.id }, data: { canvaUrl } });
    return res.json({ canvaUrl });
  }

  // Fallback: open Canva new design
  res.json({ canvaUrl: 'https://www.canva.com/design/new/', message: 'No Canva template linked yet — opening Canva home' });
});

// ── PUT /api/posters/:id ───────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const poster = await prisma.poster.findFirst({
      where: { id: req.params.id, teacherId: req.teacherId }
    });
    if (!poster) return res.status(404).json({ error: 'Not found' });

    const updated = await prisma.poster.update({
      where: { id: req.params.id },
      data: {
        city:        req.body.city        ?? poster.city,
        courseDate:  req.body.courseDate   ?? poster.courseDate,
        teacherName: req.body.teacherName ?? poster.teacherName,
        canvaUrl:    req.body.canvaUrl    ?? poster.canvaUrl,
        exportUrl:   req.body.exportUrl   ?? poster.exportUrl,
        data:        req.body.data        ?? poster.data,
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ── DELETE /api/posters/:id ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await prisma.poster.deleteMany({ where: { id: req.params.id, teacherId: req.teacherId } });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
