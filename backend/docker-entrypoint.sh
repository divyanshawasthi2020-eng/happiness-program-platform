#!/bin/sh
set -e

echo "⏳ Waiting for database..."
until npx prisma db push --schema=src/prisma/schema.prisma --skip-generate 2>&1; do
  echo "  Database not ready, retrying in 3s..."
  sleep 3
done

echo "🌱 Seeding default templates..."
node src/prisma/seed.js || echo "Seed already done or skipped."

echo "🚀 Starting HP Platform backend..."
exec node src/index.js
