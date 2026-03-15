#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Happiness Program Platform — Local Setup Script
# Run: chmod +x setup.sh && ./setup.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  🙏  Happiness Program Platform — Setup"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check prerequisites ──────────────────────────────────────────────────────
info "Checking prerequisites..."

if ! command -v node &> /dev/null; then
  err "Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  err "Node.js v18+ required. Current: $(node -v)"
  exit 1
fi
log "Node.js $(node -v)"

if ! command -v npm &> /dev/null; then
  err "npm not found."
  exit 1
fi
log "npm $(npm -v)"

# Check for Docker (optional)
DOCKER_AVAILABLE=false
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
  DOCKER_AVAILABLE=true
  log "Docker available — can use docker-compose for DB"
fi

# ── Choose DB setup method ───────────────────────────────────────────────────
echo ""
info "Database setup options:"
echo "  1) Docker (recommended — auto-starts PostgreSQL)"
echo "  2) Local PostgreSQL (already installed)"
echo "  3) Supabase (free cloud — no local DB needed)"
echo ""
read -p "Choose [1/2/3]: " DB_CHOICE

DB_URL=""

case $DB_CHOICE in
  1)
    if ! $DOCKER_AVAILABLE; then
      err "Docker not found. Install from https://docker.com"
      exit 1
    fi
    info "Starting PostgreSQL via Docker..."
    docker-compose up -d postgres redis
    sleep 4
    DB_URL="postgresql://hp_user:hp_password@localhost:5432/happiness_program"
    log "PostgreSQL running via Docker"
    ;;
  2)
    if ! command -v psql &> /dev/null; then
      err "PostgreSQL not found. Install: brew install postgresql (mac) or sudo apt install postgresql (ubuntu)"
      exit 1
    fi
    read -p "PostgreSQL password for user 'postgres': " PG_PASS
    read -p "Database name [happiness_program]: " PG_DB
    PG_DB=${PG_DB:-happiness_program}
    psql -U postgres -c "CREATE DATABASE $PG_DB;" 2>/dev/null || warn "Database may already exist"
    DB_URL="postgresql://postgres:${PG_PASS}@localhost:5432/${PG_DB}"
    log "Using local PostgreSQL"
    ;;
  3)
    echo ""
    info "Supabase setup:"
    echo "  1. Go to https://supabase.com and create a free project"
    echo "  2. Go to Settings → Database → Connection string → URI"
    echo "  3. Copy the connection string"
    echo ""
    read -p "Paste your Supabase DATABASE_URL: " DB_URL
    log "Using Supabase"
    ;;
  *)
    err "Invalid choice"
    exit 1
    ;;
esac

# ── Backend .env setup ───────────────────────────────────────────────────────
echo ""
info "Setting up backend .env..."

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

if [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  
  # Replace DATABASE_URL
  sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=\"${DB_URL}\"|" backend/.env
  
  # Replace JWT_SECRET
  sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" backend/.env
  
  rm -f backend/.env.bak
  log "backend/.env created"
else
  warn "backend/.env already exists — skipping (delete it to regenerate)"
fi

# ── Install dependencies ─────────────────────────────────────────────────────
echo ""
info "Installing backend dependencies..."
cd backend && npm install && cd ..
log "Backend deps installed"

echo ""
info "Installing frontend dependencies..."
cd frontend && npm install && cd ..
log "Frontend deps installed"

# ── Database schema ──────────────────────────────────────────────────────────
echo ""
info "Pushing database schema..."
cd backend
npx prisma db push --schema=src/prisma/schema.prisma
log "Database schema created"

echo ""
info "Seeding default message templates..."
node src/prisma/seed.js
log "Templates seeded"
cd ..

# ── Start servers ────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  🎉  Setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Frontend: ${BLUE}http://localhost:5173${NC}"
echo -e "  Backend:  ${BLUE}http://localhost:3001${NC}"
echo -e "  DB Admin: ${BLUE}npx prisma studio${NC} (run inside backend/)"
echo ""
echo -e "  To start: ${YELLOW}npm run dev${NC} (from project root)"
echo ""
echo -e "  📧 Email: Edit backend/.env → set SMTP_* variables"
echo -e "  🎨 Canva: Get free API key at https://www.canva.com/developers/"
echo ""

read -p "Start development servers now? [Y/n]: " START_NOW
if [[ "$START_NOW" != "n" && "$START_NOW" != "N" ]]; then
  npm install 2>/dev/null || true
  npm run dev
fi
