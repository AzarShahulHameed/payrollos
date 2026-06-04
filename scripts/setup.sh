#!/usr/bin/env bash
set -e

echo ""
echo "╔══════════════════════════════════════╗"
echo "║        PayrollOS — Setup Script      ║"
echo "╚══════════════════════════════════════╝"
echo ""

# ── Check prerequisites ──────────────────────────────────────
command -v node >/dev/null 2>&1 || { echo "❌  Node.js is required (>=18). Install from https://nodejs.org"; exit 1; }
echo "✅  Node $(node -v) found"

# Check for psql (PostgreSQL client)
PG_FOUND=false
command -v psql >/dev/null 2>&1 && PG_FOUND=true

# ── Prompt for DB credentials ────────────────────────────────
echo ""
echo "📋  Database configuration"
echo "    (Press Enter to use the default shown in brackets)"
echo ""

read -p "  PostgreSQL host [localhost]: " PG_HOST
PG_HOST="${PG_HOST:-localhost}"

read -p "  PostgreSQL port [5432]: " PG_PORT
PG_PORT="${PG_PORT:-5432}"

read -p "  PostgreSQL user [postgres]: " PG_USER
PG_USER="${PG_USER:-postgres}"

read -s -p "  PostgreSQL password: " PG_PASS
echo ""

read -p "  Database name [payrollos]: " PG_DB
PG_DB="${PG_DB:-payrollos}"

echo ""

# ── Generate JWT secrets ─────────────────────────────────────
if command -v openssl >/dev/null 2>&1; then
  JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')
  JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d '\n')
else
  JWT_SECRET="payrollos-jwt-secret-change-in-production-$(date +%s)"
  JWT_REFRESH_SECRET="payrollos-refresh-secret-change-in-production-$(date +%s)"
fi

DATABASE_URL="postgresql://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${PG_DB}"

# ── Write backend .env ───────────────────────────────────────
cat > backend/.env << EOF
DATABASE_URL=${DATABASE_URL}
REDIS_URL=
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
EOF

echo "✅  backend/.env created"

# ── Write frontend .env.local ────────────────────────────────
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

echo "✅  frontend/.env.local created"
echo ""

# ── Create database (if psql available) ─────────────────────
if $PG_FOUND; then
  echo "🗄   Creating database '${PG_DB}'..."
  PGPASSWORD="${PG_PASS}" psql -h "${PG_HOST}" -p "${PG_PORT}" -U "${PG_USER}" -c "CREATE DATABASE ${PG_DB};" 2>/dev/null && echo "✅  Database created" || echo "ℹ️   Database may already exist — continuing"
else
  echo "ℹ️   psql not found in PATH — please create the database '${PG_DB}' manually"
  echo "    then re-run: npm run prisma:migrate from the backend folder"
fi

echo ""

# ── Install backend dependencies ─────────────────────────────
echo "📦  Installing backend dependencies..."
cd backend && npm install 2>&1 | tail -3
echo "✅  Backend dependencies installed"
echo ""

# ── Run Prisma migrations ─────────────────────────────────────
echo "🗄   Running Prisma migrations..."
npx prisma generate
npx prisma migrate dev --name init 2>&1 | tail -8
echo "✅  Database schema applied"
cd ..
echo ""

# ── Install frontend dependencies ────────────────────────────
echo "📦  Installing frontend dependencies..."
cd frontend && npm install 2>&1 | tail -3
echo "✅  Frontend dependencies installed"
cd ..
echo ""

echo "══════════════════════════════════════════════════════"
echo "🎉  Setup complete!"
echo ""
echo "  Start backend:  cd backend  && npm run start:dev"
echo "  Start frontend: cd frontend && npm run dev"
echo ""
echo "  App:   http://localhost:3000"
echo "  API:   http://localhost:3001/api/v1"
echo "══════════════════════════════════════════════════════"
echo ""
