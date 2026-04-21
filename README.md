# SIAP PKL — SMKN 1 Badegan

Sistem Informasi & Rekomendasi Praktik Kerja Lapangan berbasis metode **SAW (Simple Additive Weighting)**. Menghubungkan empat peran: **Admin**, **Guru Pembimbing**, **Siswa**, dan **DU/DI**.

> Status: **Milestone 1 — Fondasi**. Auth & layout siap. Fitur bisnis (lowongan, SAW, pendaftaran) dibuat di milestone berikutnya.

## Stack

| Komponen         | Teknologi                                                |
| ---------------- | -------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, Server Components, Server Actions) |
| Bahasa           | TypeScript strict                                        |
| Database         | PostgreSQL 16 (via Docker Compose)                       |
| ORM              | Prisma 6                                                 |
| Auth             | Auth.js v5 (Credentials + JWT sessions)                  |
| UI               | Tailwind CSS + shadcn/ui (new-york, zinc)                |
| Form             | React Hook Form + Zod                                    |
| Ikon             | lucide-react                                             |
| Notifikasi toast | sonner                                                   |

## Prasyarat

- **Node.js 20+** (project diuji pada Node 22)
- **Docker Desktop** (atau Docker Engine + Compose plugin)
- **npm** 10+ (sudah bawaan Node)

## Setup Lokal

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

Lalu edit `.env`:

- `AUTH_SECRET` — generate string acak 32+ karakter. Contoh:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `DATABASE_URL` — sudah default ke credentials di `docker-compose.yml`. Biarkan kalau pakai Docker.
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — kredensial admin pertama (ganti password default).

### 3. Jalankan database (Docker)

```bash
docker compose up -d
```

Service yang dijalankan:
- **`db`** — Postgres 16 di `localhost:5432`
- **`pgadmin`** — GUI di `http://localhost:5050` (login: `admin@siap-pkl.local` / `admin`)

Cek health:

```bash
docker compose ps
```

### 4. Migrasi schema

```bash
npm run db:migrate
```

Perintah ini menjalankan `prisma migrate dev` — membuat migration pertama dari `prisma/schema.prisma` dan apply ke DB.

### 5. Seed data awal

```bash
npm run db:seed
```

Seed akan membuat:
- Akun **Admin** sesuai `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- Jurusan placeholder `TBD` (wajib — dipakai saat siswa baru register)
- Beberapa jurusan SMK (TKJ, RPL, MM, AKL, OTKP)
- Konfigurasi sistem default (koordinat sekolah, kuota pendaftaran, dll)

### 6. Jalankan dev server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Akun Default

Setelah seed:

- **Admin**: sesuai `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (default `admin@siap-pkl.local` / `admin123`). Akun ini sudah `VERIFIED` dan langsung bisa login.

Untuk **Siswa** & **DU/DI**: daftar via halaman `/register`. Akun baru berstatus `PENDING` sampai admin memverifikasi (fitur verifikasi dibuat di milestone 2).

## Struktur Project

```
Siap PKL/
├── docker-compose.yml          # Postgres + pgAdmin
├── prisma/
│   ├── schema.prisma           # Semua model Prisma
│   └── seed.ts                 # Seed admin + jurusan + config
├── src/
│   ├── app/
│   │   ├── (auth)/             # Route group login/register
│   │   │   ├── actions.ts      #  sign-out action
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   ├── actions.ts  #  login server action
│   │   │   │   ├── login-form.tsx
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       ├── register-form.tsx
│   │   │       └── page.tsx
│   │   ├── admin/page.tsx      # Dashboard stub per role
│   │   ├── dudi/page.tsx
│   │   ├── guru/page.tsx
│   │   ├── siswa/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   └── register/route.ts
│   │   ├── globals.css
│   │   ├── layout.tsx          # Root layout + ThemeProvider
│   │   └── page.tsx            # Landing page
│   ├── auth.config.ts          # Config edge-safe (untuk middleware)
│   ├── auth.ts                 # Auth.js v5 instance (node)
│   ├── middleware.ts           # Role-based route protection
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── dashboard-shell.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   └── sign-out-button.tsx
│   ├── lib/
│   │   ├── constants.ts        # ROLE_LABEL, DASHBOARD_BY_ROLE
│   │   ├── db.ts               # Prisma singleton
│   │   ├── session.ts          # requireRole, requireSession helper
│   │   ├── utils.ts            # cn() helper
│   │   └── validations/
│   │       └── auth.ts         # Zod schema login/register
│   └── types/
│       └── next-auth.d.ts      # Augmentasi session.user.role, dll
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── components.json             # Config shadcn
```

## Skrip npm

| Skrip              | Fungsi                                                       |
| ------------------ | ------------------------------------------------------------ |
| `npm run dev`      | Dev server di port 3000                                      |
| `npm run build`    | Prisma generate + Next build                                 |
| `npm start`        | Jalankan build production                                    |
| `npm run lint`     | ESLint (next/core-web-vitals)                                |
| `npm run typecheck`| `tsc --noEmit`                                               |
| `npm run db:up`    | Start Postgres (tanpa pgAdmin)                               |
| `npm run db:down`  | Stop semua service Docker                                    |
| `npm run db:migrate` | `prisma migrate dev`                                       |
| `npm run db:reset` | ⚠️ Reset DB (hapus semua data, re-run migration + seed)     |
| `npm run db:studio`| Buka Prisma Studio                                           |
| `npm run db:seed`  | Jalankan `prisma/seed.ts`                                    |

## Alur Auth (Milestone 1)

1. User daftar di `/register` → pilih peran (**Siswa** atau **DU/DI**) → isi email, nama, password.
2. API `/api/register` membuat `User` (status `PENDING`) + profile skeleton (`Siswa` atau `DUDI`) dalam transaksi.
3. Admin memverifikasi (milestone 2) → `User.status = VERIFIED`.
4. User login di `/login` → Auth.js `Credentials` provider cek bcrypt + status → JWT session berisi `{ id, role, status, name }`.
5. Middleware mengecek role pada setiap request dan redirect ke dashboard yang sesuai (`/admin`, `/guru`, `/siswa`, `/dudi`).

## Catatan Teknis & Trade-off

- **Strategy JWT (bukan database session).** Wajib untuk Credentials provider di Auth.js v5, dan menghilangkan kebutuhan PrismaAdapter di auth flow.
- **`auth.config.ts` vs `auth.ts` dipisah.** Middleware jalan di Edge Runtime yang tidak support `bcryptjs`/`@prisma/client`. Config edge-safe diletakkan di `auth.config.ts`, lalu `auth.ts` (node) extend untuk menambahkan Credentials provider.
- **Pesan login jelas untuk status `PENDING`/`SUSPENDED`.** Trade-off vs user-enumeration: ini sistem internal sekolah, kejelasan UX lebih penting daripada mencegah enumerasi.
- **Jurusan placeholder `TBD` saat register siswa.** Field `jurusanId` wajib di `Siswa`, tapi pada saat register publik kita belum tahu jurusannya → di-pointer ke `TBD`. Siswa wajib melengkapi di milestone 2.
- **Koordinat dummy DU/DI saat register.** `DUDI.latitude/longitude` adalah `Float` (bukan optional). DU/DI wajib update koordinat real di profil milestone 2.
- **`SAWWeight @@unique([jurusanId, isActive])` tidak efektif di Postgres untuk row dengan `jurusanId IS NULL`** (NULL dianggap distinct). Penegakan "hanya satu aktif" harus dilakukan di service layer via transaksi. Akan di-address di milestone 4.

## Troubleshooting

**`Can't reach database server at localhost:5432`**
→ Jalankan `docker compose up -d` dan tunggu healthcheck hijau (`docker compose ps`).

**`Seed jurusan belum dijalankan`** saat register siswa
→ Jalankan `npm run db:seed`.

**`[auth][error] CredentialsSignin`** saat login
→ Cek: (a) akun sudah di-seed/diverifikasi, (b) password benar, (c) `AUTH_SECRET` terisi di `.env`.

**Windows Git Bash: `node: command not found`**
→ Node ada di `C:\Program Files\nodejs\` tapi belum di PATH bash. Tambahkan ke `~/.bashrc`:
```bash
export PATH="/c/Program Files/nodejs:$PATH"
```

## Roadmap

- [x] **M1 — Fondasi**: Auth, layout, DB setup, seed minimal.
- [ ] **M2 — Manajemen User**: CRUD profil siswa/DU/DI/guru, verifikasi admin, dashboard per role.
- [ ] **M3 — Lowongan & Pencarian**: CRUD lowongan DU/DI, search/filter/peta Leaflet.
- [ ] **M4 — Mesin SAW**: Algoritma `/lib/saw`, halaman rekomendasi dengan breakdown, bobot per-jurusan.
- [ ] **M5 — Alur Pendaftaran**: Pendaftaran → approval guru → review DU/DI, timeline, notifikasi.
- [ ] **M6 — Fitur Tambahan**: Logbook, penilaian, review, pengumuman, audit log, export.
- [ ] **M7 — Seed & Testing**: Seed lengkap, E2E manual, dokumentasi.

## Lisensi

Internal — SMKN 1 Badegan.
