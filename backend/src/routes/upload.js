// ─── Upload Route — CSV/Excel Lead Import ────────────────────────────────────
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
router.use(authenticate);

const MAX_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB || '10');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.teacherId}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Only ${allowed.join(', ')} files allowed`));
  },
});

// ── POST /api/upload/leads ─────────────────────────────────────────────────
router.post('/leads', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const rows = parseFile(req.file.path);

    // Clean up uploaded file after reading
    fs.unlink(req.file.path, () => {});

    if (rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or no valid rows found' });
    }

    const normalised = rows.map(normaliseRow).filter(r => r.name || r.phone);

    res.json({
      rows: normalised,
      count: normalised.length,
      preview: normalised.slice(0, 5),
    });
  } catch (err) {
    logger.error('File parse error:', err);
    // Clean up on error
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: `File parse failed: ${err.message}` });
  }
});

// ─── Parsers ──────────────────────────────────────────────────────────────
function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const workbook = XLSX.readFile(filePath, { type: 'file', raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
  }

  // xlsx / xls
  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { raw: false, defval: '' });
}

const COLUMN_MAP = {
  name:     ['name', 'full name', 'fullname', 'lead name', 'contact name'],
  phone:    ['phone', 'phone number', 'mobile', 'mobile number', 'whatsapp', 'contact'],
  email:    ['email', 'email address', 'e-mail'],
  city:     ['city', 'location', 'town', 'place'],
  source:   ['source', 'lead source', 'channel'],
  interest: ['interest', 'interest level', 'priority', 'hot/warm/cold'],
  status:   ['status', 'lead status', 'stage'],
};

function normaliseRow(row) {
  const lowerKeys = Object.fromEntries(
    Object.keys(row).map(k => [k.toLowerCase().trim(), k])
  );

  const get = (field) => {
    for (const alias of COLUMN_MAP[field]) {
      const originalKey = lowerKeys[alias];
      if (originalKey && row[originalKey]) return String(row[originalKey]).trim();
    }
    return '';
  };

  return {
    name:     get('name'),
    phone:    get('phone'),
    email:    get('email'),
    city:     get('city'),
    source:   get('source')   || 'IMPORT',
    interest: get('interest') || 'WARM',
    status:   get('status')   || 'NEW',
  };
}

// ── GET /api/upload/template ───────────────────────────────────────────────
// Download a blank CSV template
router.get('/template', (req, res) => {
  const data = [
    ['Name', 'Phone', 'Email', 'City', 'Source', 'Interest', 'Status'],
    ['Priya Sharma', '9876543210', 'priya@email.com', 'Mumbai', 'Instagram', 'Hot', 'New'],
    ['Rahul Mehta',  '8765432109', 'rahul@email.com', 'Pune',   'Referral',  'Warm', 'Contacted'],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = data[0].map(h => ({ wch: Math.max(h.length + 4, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, 'Leads Template');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=leads_template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

export default router;
