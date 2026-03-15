# Contributing to Happiness Program Platform

Thank you for wanting to improve this platform for Art of Living teachers! 🙏

## Getting started

```bash
git clone https://github.com/your-org/happiness-program-platform.git
cd happiness-program-platform
chmod +x setup.sh && ./setup.sh
```

## Project structure

```
backend/   Node.js + Express + Prisma + PostgreSQL
frontend/  React 18 + Vite + Zustand + Recharts
```

The backend is a REST API. The frontend is a single-page app that consumes it.

## Making changes

1. **Fork** the repository on GitHub
2. **Create a branch** — `git checkout -b feature/your-feature`
3. **Make your changes** and test locally
4. **Commit** with a clear message — `feat: add SMS reminders`
5. **Push** and open a **Pull Request**

### Commit message format

```
feat:  new feature
fix:   bug fix
docs:  documentation change
style: formatting, no logic change
refactor: code restructure without feature change
chore: dependency updates, CI changes
```

## Backend changes

- All routes live in `backend/src/routes/`
- Add new routes to `backend/src/index.js`
- Database changes go in `backend/src/prisma/schema.prisma` — run `npm run db:push` after
- Every new route **must** use the `authenticate` middleware
- Teachers must only access **their own data** — always filter by `teacherId: req.teacherId`

### Adding a new API route

```js
// backend/src/routes/myfeature.js
import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);  // ← always required

router.get('/', async (req, res) => {
  const data = await prisma.myModel.findMany({ where: { teacherId: req.teacherId } });
  res.json(data);
});

export default router;
```

Then register in `index.js`:
```js
import myFeatureRoutes from './routes/myfeature.js';
app.use('/api/myfeature', myFeatureRoutes);
```

## Frontend changes

- Pages live in `frontend/src/pages/`
- Add new pages to the router in `frontend/src/main.jsx`
- Add navigation links in `frontend/src/components/layout/DashboardLayout.jsx`
- Use the `api` service for all backend calls — never use `fetch` directly
- All styles go in `frontend/src/styles/global.css` using CSS variables

### Adding a new page

```jsx
// frontend/src/pages/MyPage.jsx
import React from 'react';
import api from '../services/api.js';

export default function MyPage() {
  return (
    <div>
      <div className="page-header">
        <div className="page-title">My Page</div>
        <div className="page-sub">Description here</div>
      </div>
      {/* content */}
    </div>
  );
}
```

## Database schema changes

1. Edit `backend/src/prisma/schema.prisma`
2. Run `npm run db:push --prefix backend` to apply to local DB
3. Update any seed data in `backend/src/prisma/seed.js`
4. Document the change in your PR description

## Good first issues

These are well-scoped contributions that are welcome:

- [ ] **SMS reminders** via Twilio or Textlocal (India-friendly)
- [ ] **Google Sheets export** using Google Sheets API
- [ ] **Referral tracking** — who referred which lead, referral chain
- [ ] **Bulk lead status update** — select multiple leads and change status at once
- [ ] **Search bar** in leads page with full-text search
- [ ] **Hindi/Marathi template support** — default templates in regional languages
- [ ] **Course attendance** — mark which participants attended each session
- [ ] **Post-course survey** — simple form with responses stored per participant
- [ ] **Dark mode** — toggle in settings, persisted preference
- [ ] **Progressive Web App (PWA)** — offline access on mobile
- [ ] **React Query** — replace manual `useEffect` API calls with React Query
- [ ] **Unit tests** — Jest tests for backend route handlers
- [ ] **Rate limiting per teacher** — prevent one teacher from hammering the API
- [ ] **Admin panel** — view all teachers, deactivate accounts, see aggregate stats

## Questions?

Open a GitHub Discussion or Issue. All skill levels are welcome.

*Jai Gurudev 🙏*
