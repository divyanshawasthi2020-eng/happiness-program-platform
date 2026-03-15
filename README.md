# 🙏 Happiness Program — Teacher Platform

> Open-source multi-teacher management platform for Art of Living Happiness Program teachers.
> Manage leads, run WhatsApp & email campaigns, generate posters, and track courses — all from one dashboard.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://postgresql.org)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 Multi-teacher login | Each teacher has a private dashboard. Code-based auth, no passwords to remember. |
| 👥 Lead pipeline | Full CRUD, filters, bulk delete, CSV/Excel import with duplicate detection |
| 📊 Analytics | Funnel charts, source breakdown, conversion rates, weekly growth |
| 📤 WhatsApp campaigns | Bulk wa.me links with configurable delay — free, zero ban risk |
| 📧 Email campaigns | SMTP/Gmail/Brevo bulk emails with template variables |
| 📝 Shared templates | Library of message templates editable by any teacher, shared across all |
| 🎨 Poster generator | In-browser HTML canvas posters + optional Canva integration |
| 📅 Course management | Track batches, seat fill rates, promotion timelines |
| ⏰ Reminders | Scheduled daily/weekly reminder tasks |
| ⚙️ Settings | Per-teacher SMTP config, WhatsApp number, org link |

---

## 🚀 Quick Start

### Option A — Automated setup (recommended)

```bash
git clone https://github.com/your-org/happiness-program-platform.git
cd happiness-program-platform
chmod +x setup.sh && ./setup.sh
```

The script will:
1. Check Node.js 18+ is installed
2. Ask you to choose PostgreSQL source (Docker / local / Supabase)
3. Create `backend/.env` with a secure JWT secret
4. Install all dependencies
5. Push database schema
6. Seed 12 default message templates
7. Optionally start dev servers

### Option B — Docker (one command)

```bash
git clone https://github.com/your-org/happiness-program-platform.git
cd happiness-program-platform
cp backend/.env.example backend/.env   # edit JWT_SECRET at minimum
docker-compose up
```

Open `http://localhost:5173` — done.

### Option C — Manual setup

```bash
# 1. Clone
git clone https://github.com/your-org/happiness-program-platform.git
cd happiness-program-platform

# 2. Install root dev deps
npm install

# 3. Backend
cd backend
cp .env.example .env         # fill in DATABASE_URL + JWT_SECRET
npm install
npx prisma db push --schema=src/prisma/schema.prisma
node src/prisma/seed.js
cd ..

# 4. Frontend
cd frontend
npm install
cd ..

# 5. Start both
npm run dev
```

---

## 🗄️ Database Schema

```
Teacher ──┬── Lead          (name, phone, email, city, source, interest, status)
          ├── Course         (city, date, seats, venue)
          ├── Campaign       (channel, template, filters, delay, status)
          ├── MessageTemplate (body, variables, shared flag)
          ├── MessageLog     (sent/failed per lead per campaign)
          ├── Reminder       (time, frequency, text)
          ├── Poster         (template, fields, canvaUrl)
          └── Session        (JWT token, expiry)
```

**Key design decisions:**
- Teachers only ever see their own leads (enforced at query level, not just frontend)
- `MessageTemplate.teacherId = NULL` → global built-in template visible to all
- `MessageTemplate.isShared = true` → teacher-created but visible to all
- Sessions stored in DB so logout is real (token revocation)

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login or register (first use creates account) |
| POST | `/api/auth/logout` | Revoke session token |
| GET  | `/api/auth/me` | Get current teacher |

### Leads
| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/leads` | List with pagination, filters, search |
| GET    | `/api/leads/stats` | Funnel + source + interest counts |
| POST   | `/api/leads` | Create single lead |
| PUT    | `/api/leads/:id` | Update lead |
| DELETE | `/api/leads/:id` | Delete lead |
| POST   | `/api/leads/bulk-import` | Import array of leads |
| POST   | `/api/leads/bulk-delete` | Delete by ID array |

### Campaigns
| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/campaigns` | List campaigns |
| POST   | `/api/campaigns` | Create campaign |
| POST   | `/api/campaigns/:id/start` | Start — returns WA links or starts email |
| POST   | `/api/campaigns/:id/log-sent` | Log individual WA message sent |
| POST   | `/api/campaigns/:id/pause` | Pause running campaign |
| DELETE | `/api/campaigns/:id` | Delete |

### Upload
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/upload/leads` | Parse CSV/Excel → return rows (no DB write yet) |
| GET  | `/api/upload/template` | Download blank Excel template |

---

## 💬 WhatsApp Strategy

This platform uses **three tiers** of WhatsApp integration, in order of cost:

### Tier 1 — wa.me links (default, 100% free)
- Every lead has a "Send WhatsApp" button
- Campaign start generates `wa.me/<phone>?text=<encoded_message>` links
- Browser opens each link automatically with a configurable delay (default: 4s)
- You click "Send" in each WhatsApp window
- **Zero cost, zero ban risk** — you're sending manually like a human

### Tier 2 — WA-JS (free, automated, needs QR scan)
- Open-source library: [github.com/pedroslopez/whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- Scan QR once, then API sends messages automatically
- Set `WA_MODE=wajs` in `.env`
- **Risk:** WhatsApp occasionally bans automation; use with delays (5–8s between messages)
- Best for: high-volume teachers who can't click each message

### Tier 3 — Official API (paid, safest for bulk)
| Provider | Price | Notes |
|---|---|---|
| Interakt | ₹999/mo | Indian support, good UX |
| WATI | ₹2,500/mo | Full chatbot + team inbox |
| 360dialog | ~$5/mo | Cheapest official API |

**Recommendation:** Start with Tier 1. Move to Tier 2 when you have 50+ leads/course. Move to Tier 3 only when running 3+ courses/month or need automated follow-ups without clicking.

---

## 📧 Email Setup

### Gmail (free, 500 emails/day)

1. Enable 2FA on your Google account
2. Go to `myaccount.google.com` → Security → App passwords
3. Create app password for "Mail"
4. In Settings page of the dashboard, fill:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `your@gmail.com`
   - Pass: 16-character app password

### Brevo / Sendinblue (free 300 emails/day)

1. Sign up at [brevo.com](https://brevo.com) (free)
2. Go to Settings → SMTP & API → SMTP
3. Fill in dashboard Settings with Brevo SMTP credentials

### AWS SES (cheapest at scale — ₹0.10 per 1000 emails)

Set `SMTP_HOST=email-smtp.ap-south-1.amazonaws.com` and use SES SMTP credentials.

---

## 🎨 Canva Poster Integration

**Built-in poster generator** (zero setup): The Posters page uses HTML Canvas to generate 800×800px posters with live preview. Download as PNG directly.

**Canva deep-link** (free Canva API):
1. Go to [canva.com/developers](https://www.canva.com/developers/)
2. Create a free developer account → New integration
3. Copy Client ID and Client Secret to `backend/.env`
4. Set redirect URI: `http://localhost:5173/posters/canva-callback`
5. Teachers click "Connect Canva" → authorise once → "Open in Canva" appears on each poster

**Canva Autofill API**: Pre-fills city, date, teacher name into a Canva template via URL parameters. Create your own Canva template, copy its design ID, and set it in `backend/src/routes/posters.js → POSTER_TEMPLATES[].canvaTemplateId`.

---

## 🌐 Hosting Options

### Local (development)
```bash
npm run dev          # frontend on :5173, backend on :3001
```

### Local production (Docker)
```bash
docker-compose up    # everything on :5173
```

### Cloud (free tiers)

| Service | What to host | Free tier |
|---|---|---|
| [Railway](https://railway.app) | Backend + PostgreSQL | $5/mo credit |
| [Render](https://render.com) | Backend | 750 hrs/mo free |
| [Supabase](https://supabase.com) | PostgreSQL | 500MB free |
| [Vercel](https://vercel.com) | Frontend | Unlimited |
| [Netlify](https://netlify.com) | Frontend | Unlimited |

**Recommended free setup:**
```
Frontend  → Vercel (free)
Backend   → Render web service (free)
Database  → Supabase (free 500MB)
```

Deploy steps for Render:
1. Push code to GitHub
2. New Web Service → connect repo → Root Dir: `backend`
3. Build: `npm install && npx prisma db push`
4. Start: `node src/index.js`
5. Add environment variables from `.env.example`

---

## 🔧 Environment Variables

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=minimum_32_character_random_string

# Optional — email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app_password

# Optional — Canva integration
CANVA_CLIENT_ID=...
CANVA_CLIENT_SECRET=...

# Optional — Redis (enables background job queues)
REDIS_URL=redis://localhost:6379
```

---

## 🤝 Contributing

This is an open-source project for the Art of Living community. All improvements welcome.

```bash
# Fork → clone → branch
git checkout -b feature/your-feature

# Make changes, test, commit
git commit -m "feat: your feature description"

# Push + open PR
git push origin feature/your-feature
```

**Good first contributions:**
- [ ] Add SMS support (Twilio / Textlocal)
- [ ] Add Google Sheets export
- [ ] Add referral tracking (who referred whom)
- [ ] Add bulk status update in leads table
- [ ] Add course attendance tracking
- [ ] Add mobile-responsive sidebar
- [ ] Add Hindi/regional language template support

---

## 📂 Full File Structure

```
happiness-program-platform/
├── setup.sh                    # One-click setup script
├── docker-compose.yml          # Docker: postgres + redis + app
├── package.json                # Root monorepo scripts
│
├── backend/
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js                    # Express server, middleware, routes
│       ├── prisma/
│       │   ├── schema.prisma           # Full DB schema (9 models)
│       │   └── seed.js                 # 12 default WhatsApp + email templates
│       ├── routes/
│       │   ├── auth.js                 # Login, logout, /me
│       │   ├── leads.js                # CRUD + bulk import + stats
│       │   ├── courses.js              # Course management
│       │   ├── campaigns.js            # WA links + email campaigns
│       │   ├── templates.js            # Shared message library
│       │   ├── posters.js              # Poster CRUD + Canva OAuth
│       │   ├── upload.js               # CSV/Excel parse → rows
│       │   ├── teachers.js             # Profile + SMTP config
│       │   └── reminders.js            # Reminder CRUD
│       ├── middleware/
│       │   └── auth.js                 # JWT + session validation
│       ├── services/
│       │   └── email.js                # Nodemailer multi-provider
│       ├── utils/
│       │   ├── db.js                   # Prisma client singleton
│       │   ├── logger.js               # Winston logger
│       │   └── templateEngine.js       # {Variable} substitution
│       └── queues/
│           └── index.js                # Bull/Redis job queues (optional)
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx                    # App router
│       ├── styles/global.css           # Full design system
│       ├── store/
│       │   └── authStore.js            # Zustand + persist
│       ├── services/
│       │   └── api.js                  # Axios + 401 interceptor
│       ├── components/
│       │   └── layout/
│       │       └── DashboardLayout.jsx # Sidebar + topbar
│       └── pages/
│           ├── LoginPage.jsx           # Auth with teacher code
│           ├── OverviewPage.jsx        # Charts, funnel, tasks
│           ├── LeadsPage.jsx           # Table + WA modal + CSV import
│           ├── CampaignsPage.jsx       # Bulk WA + email + delay
│           ├── TemplatesPage.jsx       # Shared library + editor
│           ├── PostersPage.jsx         # Canvas generator + Canva
│           └── CoursesPage.jsx         # Courses + Reminders + Settings
│
└── docs/
    └── (this README)
```

---

## 📋 Cost Summary

| Component | Free option | Paid upgrade |
|---|---|---|
| Database | Supabase free (500MB) | Supabase Pro $25/mo |
| Backend hosting | Render free | Railway $5/mo |
| Frontend hosting | Vercel/Netlify free | — |
| WhatsApp | wa.me links | Interakt ₹999/mo |
| Email | Gmail App Password | Brevo / AWS SES |
| Canva | Free API | Canva Pro ₹350/mo |
| **Total** | **₹0** | **₹999–₹3,500/mo** |

---

## 📄 License

MIT License — free to use, modify, and distribute. Attribution appreciated.

---

*Built with ❤️ for the Art of Living community*
# happiness-program-platform
