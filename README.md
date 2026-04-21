# SIAP PKL — SMKN 1 Badegan

Platform manajemen PKL SMKN 1 Badegan untuk admin, guru, siswa, dan DU/DI. Rekomendasi lowongan otomatis via metode **Simple Additive Weighting (SAW)**.

## Stack

| Komponen         | Teknologi                                                  |
| ---------------- | ---------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Server Components, Server Actions) |
| Bahasa           | TypeScript strict                                          |
| Database         | PostgreSQL 16 (via Docker Compose)                         |
| ORM              | Prisma 6                                                   |
| Auth             | Auth.js v5 (Credentials + JWT)                             |
| UI               | Tailwind CSS + shadcn/ui (new-york, zinc)                  |
| Form             | React Hook Form + Zod                                      |
| Peta             | Leaflet + React Leaflet                                    |
| Import Excel     | ExcelJS                                                    |
| Ikon & toast     | lucide-react, sonner                                       |

## Fitur

**Empat peran** — Admin, Guru Pembimbing, Siswa, DU/DI — masing-masing dengan dashboard, navigasi, dan route protection berbasis middleware.

**Admin**
- Master data: jurusan, kelas (cascading di bawah jurusan), keahlian, dokumen, bidang PKL
- Kelola user: siswa, guru, DU/DI (verifikasi + reset password)
- **Import siswa massal** via Excel dengan template downloadable + validasi all-or-nothing
- Konfigurasi bobot SAW (global & per-jurusan)
- Monitoring pendaftaran, logbook, penilaian lintas-peran
- Audit log

**Siswa**
- Profil lengkap: data diri, koordinat (Leaflet), bidang minat, keahlian, dokumen
- Cari lowongan + **Rekomendasi SAW** dengan breakdown skor per kriteria
- Pendaftaran PKL, logbook harian, lihat nilai, review DU/DI

**Guru Pembimbing**
- Approval pendaftaran siswa bimbingan
- Verifikasi logbook & input penilaian akhir

**DU/DI**
- Kelola lowongan & kuota (pisah laki-laki/perempuan)
- Review pendaftar → terima/tolak, verifikasi logbook, nilai siswa, review mereka

## Prasyarat

- **Node.js 20+** (diuji pada Node 22)
- **Docker Desktop** (atau Docker Engine + Compose plugin)
- **npm** 10+

## Setup

### 1. Clone & install

```bash
git clone <repo-url>
cd "Siap PKL"
npm install
```

`postinstall` otomatis menjalankan `prisma generate`.

### 2. Siapkan environment variables

```bash
cp .env.example .env
```

Edit `.env`:

- `AUTH_SECRET` — string acak 32+ karakter:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `DATABASE_URL` — sudah default ke credentials `docker-compose.yml`.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — kredensial admin pertama.

### 3. Jalankan database

```bash
docker compose up -d
```

Service yang dijalankan:
- **`db`** — Postgres 16 di `localhost:5432`
- **`pgadmin`** — GUI di `http://localhost:5050` (login: `admin@siap-pkl.local` / `admin`)

### 4. Migrasi & seed

```bash
npm run db:migrate
npm run db:seed        # master data (aman di produksi: admin, jurusan, kelas, keahlian, dokumen, bidang, bobot SAW)
npm run db:seed:demo   # opsional — dummy guru/siswa/DUDI/lowongan untuk development
```

### 5. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Akun Default

Setelah seed:

- **Admin**: sesuai `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (default `admin@siap-pkl.local` / `admin123`).

**Siswa** dibuat oleh admin (single create atau import Excel). **DU/DI** mendaftar sendiri di `/register` → menunggu verifikasi admin.

## Struktur Project

```
Siap PKL/
├── docker-compose.yml
├── prisma/
│   ├── schema.prisma        # Model Prisma (User, Siswa, DUDI, Lowongan, Pendaftaran, SAWWeight, dll)
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/          # /login, /register
│   │   ├── admin/           # Master data, kelola user, SAW weight, import siswa
│   │   ├── guru/            # Approval, logbook, penilaian
│   │   ├── siswa/           # Profil, lowongan, rekomendasi, pendaftaran, logbook, review
│   │   ├── dudi/            # Lowongan, pendaftar, logbook, penilaian, review
│   │   └── api/
│   ├── auth.config.ts       # Edge-safe config (middleware)
│   ├── auth.ts              # Auth.js v5 (node runtime + Credentials)
│   ├── middleware.ts        # Role-based route protection
│   ├── components/ui/       # shadcn/ui primitives
│   ├── lib/
│   │   ├── db.ts            # Prisma singleton
│   │   ├── saw.ts           # Engine SAW (normalisasi + skor)
│   │   ├── audit.ts         # logAudit()
│   │   ├── nav.ts           # Konfigurasi sidebar per-role
│   │   ├── session.ts       # requireRole helper
│   │   └── validations/     # Zod schemas per-fitur
│   └── types/
└── components.json
```

## Skrip npm

| Skrip                | Fungsi                                             |
| -------------------- | -------------------------------------------------- |
| `npm run dev`        | Dev server di port 3000                            |
| `npm run build`      | Prisma generate + Next build                       |
| `npm start`          | Jalankan build production                          |
| `npm run lint`       | ESLint                                             |
| `npm run typecheck`  | `tsc --noEmit`                                     |
| `npm run db:up`      | Start Postgres                                     |
| `npm run db:down`    | Stop service Docker                                |
| `npm run db:migrate` | `prisma migrate dev`                               |
| `npm run db:reset`   | ⚠️ Reset DB (hapus data, re-run migration + seed) |
| `npm run db:studio`  | Buka Prisma Studio                                 |
| `npm run db:seed`    | Seed master data (production-safe)                 |
| `npm run db:seed:demo` | Seed data demo (guru/siswa/DUDI/lowongan — dev only) |

## Catatan Teknis

- **JWT session (bukan database).** Wajib untuk Credentials provider Auth.js v5; menghilangkan kebutuhan PrismaAdapter di auth flow.
- **`auth.config.ts` vs `auth.ts` dipisah.** Middleware jalan di Edge Runtime yang tidak support `bcryptjs`/`@prisma/client`; config edge-safe di `auth.config.ts`, `auth.ts` (node) extend untuk Credentials.
- **SAW bobot per-jurusan.** `SAWWeight` bisa global (`jurusanId = null`) atau spesifik; saat scoring, bobot jurusan meng-override global.
- **Soft delete** dipakai untuk User/Siswa/Guru/DUDI (kolom `deletedAt`) supaya rekam PKL/audit trail tetap utuh.

## Troubleshooting

**`Can't reach database server at localhost:5432`**
→ `docker compose up -d` dan cek `docker compose ps` sampai healthcheck hijau.

**`[auth][error] CredentialsSignin`** saat login
→ Pastikan akun sudah di-seed & verified, password benar, `AUTH_SECRET` terisi.

**Windows Git Bash: `node: command not found`**
→ Tambahkan ke `~/.bashrc`:
```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

## Dokumentasi

- [docs/TESTING.md](docs/TESTING.md) — checklist E2E manual per-peran, skenario integrasi, regression
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploy VPS produksi (Docker Compose + Nginx + Let's Encrypt)

## Roadmap

- [x] **M1 — Fondasi**: Auth, layout, DB, seed minimal
- [x] **M2 — Manajemen User**: CRUD siswa/guru/DU/DI, verifikasi admin, dashboard per-role
- [x] **M3 — Master Data**: Jurusan, kelas, keahlian, dokumen, bidang PKL
- [x] **M4 — Lowongan & Pencarian**: CRUD lowongan DU/DI, search/filter/peta Leaflet
- [x] **M5 — Mesin SAW**: Engine skor, halaman rekomendasi, bobot per-jurusan
- [x] **M6 — Alur Pendaftaran**: Pendaftaran → approval guru → review DU/DI, timeline
- [x] **M7 — Logbook, Penilaian, Review**
- [x] **M8 — Import siswa massal** (Excel + template + validasi all-or-nothing)
- [x] **M9 — Finalisasi**: Seed master + demo, checklist E2E, Dockerfile + compose prod + Nginx, docs deploy VPS

## Lisensi

Internal — SMKN 1 Badegan.
