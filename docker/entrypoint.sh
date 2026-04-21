#!/bin/sh
# Entrypoint container produksi SIAP PKL.
# 1. Jalankan `prisma migrate deploy` — sync schema ke DB (idempoten).
# 2. Jalankan seed master (upsert, aman di-run ulang).
# 3. Eksekusi command yang di-pass (default: node server.js).
set -e

echo "[entrypoint] Menunggu database siap..."
# Retry sederhana: 30 detik max.
tries=0
until node -e "require('net').createConnection({ host: process.env.DB_HOST || 'db', port: Number(process.env.DB_PORT || 5432) }).on('connect', () => process.exit(0)).on('error', () => process.exit(1))" 2>/dev/null; do
  tries=$((tries + 1))
  if [ "$tries" -ge 30 ]; then
    echo "[entrypoint] Database tidak siap dalam 30 detik — abort."
    exit 1
  fi
  sleep 1
done
echo "[entrypoint] Database siap."

echo "[entrypoint] Menjalankan prisma migrate deploy..."
npx --no-install prisma migrate deploy

if [ "${RUN_SEED_ON_START:-true}" = "true" ]; then
  echo "[entrypoint] Menjalankan seed master..."
  # tsx tidak ada di image produksi — compile sekali di builder atau pakai prisma db seed.
  npx --no-install prisma db seed || echo "[entrypoint] Seed skipped/failed (non-fatal)"
fi

echo "[entrypoint] Menjalankan aplikasi: $@"
exec "$@"
