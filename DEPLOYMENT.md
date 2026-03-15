# Deployment Guide

This guide covers deploying the Happiness Program Platform to the cloud for free (or near-free).

---

## Option A — Railway (Recommended, ~$5/mo credit)

Railway runs both the backend and database in one place. Easiest setup.

### 1. Create accounts
- [railway.app](https://railway.app) — free $5/month credit
- Connect your GitHub account

### 2. Deploy PostgreSQL

In Railway dashboard:
1. New Project → Add Service → Database → PostgreSQL
2. Railway auto-generates `DATABASE_URL` — copy it

### 3. Deploy backend

1. New Service → GitHub Repo → select your fork
2. Set **Root Directory** to `backend`
3. Set **Build Command**: `npm install && npx prisma db push --schema=src/prisma/schema.prisma && node src/prisma/seed.js`
4. Set **Start Command**: `node src/index.js`
5. Add environment variables:

```
DATABASE_URL         = (from PostgreSQL service above)
JWT_SECRET           = (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
NODE_ENV             = production
FRONTEND_URL         = https://your-frontend.vercel.app
PORT                 = 3001
SMTP_HOST            = smtp.gmail.com        (optional)
SMTP_PORT            = 587                   (optional)
SMTP_USER            = your@gmail.com        (optional)
SMTP_PASS            = your_app_password     (optional)
```

6. Deploy → Railway gives you a URL like `https://hp-backend-xxx.railway.app`

### 4. Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   VITE_API_URL = https://hp-backend-xxx.railway.app
   ```
4. Update `frontend/vite.config.js` proxy OR update `frontend/src/services/api.js` baseURL:
   ```js
   const api = axios.create({
     baseURL: import.meta.env.VITE_API_URL || '/api',
   });
   ```
5. Deploy → Vercel gives you `https://your-app.vercel.app`
6. Go back to Railway backend → update `FRONTEND_URL` to your Vercel URL

---

## Option B — Render + Supabase (100% free tier)

### Database: Supabase

1. [supabase.com](https://supabase.com) → New Project (free 500MB)
2. Settings → Database → URI → copy connection string
3. Append `?pgbouncer=true&connection_limit=1` to the URI for PgBouncer compatibility

### Backend: Render

1. [render.com](https://render.com) → New → Web Service
2. Connect GitHub repo
3. Settings:
   - **Root Directory**: `backend`
   - **Build**: `npm install && npx prisma db push --schema=src/prisma/schema.prisma && node src/prisma/seed.js`
   - **Start**: `node src/index.js`
   - **Environment**: Node
4. Add all env vars (same as Railway section above)
5. **Free tier note**: Render free tier sleeps after 15 min inactivity — first request takes ~30s. Upgrade to Starter ($7/mo) to keep it awake.

### Frontend: Netlify

1. [netlify.com](https://netlify.com) → New site from Git
2. **Base directory**: `frontend`
3. **Build command**: `npm run build`
4. **Publish directory**: `frontend/dist`
5. Add env var: `VITE_API_URL = https://your-render-service.onrender.com`

---

## Option C — VPS / Self-hosted (cheapest at scale)

For 10+ teachers or high volume, a $6/mo DigitalOcean droplet is most cost-effective.

```bash
# On Ubuntu 22.04 VPS:

# 1. Install dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs postgresql nginx

# 2. Create database
sudo -u postgres createuser hp_user
sudo -u postgres createdb happiness_program -O hp_user
sudo -u postgres psql -c "ALTER USER hp_user WITH PASSWORD 'your_password';"

# 3. Clone and configure
git clone https://github.com/your-org/happiness-program-platform.git /opt/hp
cd /opt/hp/backend
cp .env.example .env
# Edit .env with DATABASE_URL and JWT_SECRET
npm install
npm run db:push
npm run db:seed

# 4. Configure nginx
sudo tee /etc/nginx/sites-available/hp << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /opt/hp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/hp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. Build frontend
cd /opt/hp/frontend && npm install && npm run build

# 6. Run backend with PM2
npm install -g pm2
cd /opt/hp/backend && pm2 start src/index.js --name hp-backend
pm2 startup && pm2 save

# 7. SSL with Let's Encrypt (free)
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `JWT_SECRET` | ✅ Yes | Random 32+ char string — never share |
| `PORT` | No | Backend port (default: 3001) |
| `NODE_ENV` | No | `production` for cloud |
| `FRONTEND_URL` | No | CORS allowed origin |
| `SMTP_HOST` | No | Email provider host |
| `SMTP_PORT` | No | Email provider port (587 or 465) |
| `SMTP_USER` | No | Email username |
| `SMTP_PASS` | No | Email password / app password |
| `SMTP_FROM` | No | From name and address |
| `CANVA_CLIENT_ID` | No | Canva API integration |
| `CANVA_CLIENT_SECRET` | No | Canva API integration |
| `REDIS_URL` | No | Enables job queues (optional) |
| `WA_MODE` | No | `walink` (default) or `wajs` |

---

## Cost comparison

| Setup | Monthly cost | Best for |
|---|---|---|
| Railway + Vercel | ~$5 | 1–5 teachers, getting started |
| Render free + Supabase free + Netlify free | **$0** | Testing, low traffic |
| DigitalOcean Droplet $6 + managed DB $15 | ~$21 | 10+ teachers, reliable |
| Railway Pro + Vercel Pro | ~$20 | Growing platform |

---

## Updating (zero-downtime)

```bash
# Railway / Render: push to main branch → auto-deploys

# VPS:
cd /opt/hp
git pull origin main
cd backend && npm install && npm run db:push
cd ../frontend && npm install && npm run build
pm2 restart hp-backend
```

---

## Backups

The platform has a built-in backup feature under **Settings → Export & Backup**.
For automated database backups on VPS:

```bash
# Add to crontab (crontab -e):
0 2 * * * pg_dump happiness_program | gzip > /backups/hp_$(date +%Y%m%d).sql.gz
# Keep last 30 days:
find /backups -name "hp_*.sql.gz" -mtime +30 -delete
```
