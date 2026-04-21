# syntax=docker/dockerfile:1.7
# Dockerfile produksi multi-stage untuk Next.js 16 (App Router) + Prisma.
# Menggunakan output: "standalone" supaya image final minimal.

ARG NODE_VERSION=22-alpine

# ============================================================
# Stage 1: deps — install semua dependency (dev + prod)
# ============================================================
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# openssl dibutuhkan Prisma di Alpine.
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
# --ignore-scripts: skip postinstall (prisma generate) di stage ini,
# nanti di-run manual di stage builder dengan schema yang sudah ada.
RUN npm ci --ignore-scripts


# ============================================================
# Stage 1b: prod-deps — production-only node_modules (untuk seed runtime)
# ============================================================
FROM node:${NODE_VERSION} AS prod-deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
# --ignore-scripts skip postinstall (prisma generate butuh prisma CLI dari devDeps).
# Tapi esbuild butuh binary platform-nya di-download — `npm rebuild esbuild`
# menjalankan install script-nya saja (tidak butuh prisma CLI).
RUN npm ci --omit=dev --ignore-scripts \
 && npm rebuild esbuild
RUN npx prisma generate


# ============================================================
# Stage 2: builder — prisma generate + next build
# ============================================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetry off di CI/build.
ENV NEXT_TELEMETRY_DISABLED=1

# DATABASE_URL build-time: Prisma Client butuh ini ada, tapi tidak
# benar-benar konek ke DB saat build. Dummy URL OK.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

RUN npx prisma generate
RUN npm run build


# ============================================================
# Stage 3: runner — image produksi minimal
# ============================================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl tini

# tsx untuk menjalankan script TypeScript (seed) di container produksi.
RUN npm install -g tsx@4.19.2

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root untuk keamanan.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Standalone output: minimal server + static assets + public assets.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Full production node_modules untuk migrate deploy + seed (tsx).
# Menimpa node_modules minimal yang ada di .next/standalone supaya
# dependency seperti bcryptjs bisa di-resolve oleh tsx.
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Entrypoint — jalankan migrate deploy lalu server.js.
COPY --chown=nextjs:nodejs docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
