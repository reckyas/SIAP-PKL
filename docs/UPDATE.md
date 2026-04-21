# Update SIAP PKL di VPS

Panduan update aplikasi yang sudah live di VPS. Fokus ke skenario umum:
kamu push perubahan ke git, lalu ingin VPS ikut update.

Dokumen ini menggantikan section "Update aplikasi" singkat di
[DEPLOY.md](DEPLOY.md) dan [DEPLOY-aapanel.md](DEPLOY-aapanel.md).

---

## 0. Tentukan Varian Compose Kamu

Pilih file compose yang kamu pakai — **semua perintah `docker compose`
di bawah pakai file ini**:

| Varian | File | Kapan dipakai |
| ------ | ---- | ------------- |
| **aaPanel** | `docker-compose.prod.aapanel.yml` | Nginx + SSL di-handle aaPanel UI (default di VPS kamu) |
| **Containerized Nginx** | `docker-compose.prod.yml` | Nginx + certbot jalan di container |

Untuk mempersingkat, set alias sementara per sesi SSH:

```bash
cd /opt/siap-pkl
# Ganti path file sesuai varian kamu:
export DC="docker compose -f docker-compose.prod.aapanel.yml --env-file .env.prod"
```

Setelah itu tinggal pakai `$DC ps`, `$DC logs app`, dll.

---

## 1. Alur Update Standar (Kode + UI Saja)

Gunakan alur ini kalau perubahan **tidak ada** file baru di `prisma/migrations/`
— mayoritas PR (feature UI, bug fix, import excel, dll).

```bash
cd /opt/siap-pkl

# 1. Pastikan working tree bersih di VPS
git status                          # harus "nothing to commit"

# 2. Ambil perubahan dari remote
git fetch origin
git log --oneline HEAD..origin/main # preview commit yang masuk
git pull --ff-only origin main      # fast-forward; hindari merge commit accidental

# 3. Rebuild + restart app (db tidak disentuh)
$DC up -d --build app

# 4. Verifikasi
$DC ps                              # siap-pkl-app Up (beberapa detik)
$DC logs --tail=50 app              # cari "[entrypoint] Menjalankan aplikasi"
curl -I http://127.0.0.1:${APP_PORT:-3100}   # 200 atau 307 redirect ke /login
```

Nginx/aaPanel tidak perlu disentuh — target `127.0.0.1:<APP_PORT>` tetap
sama, dan URL publik tidak berubah.

**Waktu tipikal:** 1–3 menit (build stage cache re-use Next.js).

### Kenapa `--build app` saja, bukan seluruh stack

- `$DC up -d --build app` hanya **rebuild service `app`**, tidak menyentuh `db`.
  Container Postgres tetap running, volume `siap_pkl_db_data` aman.
- Tanpa `--build`, Docker akan pakai image lama walaupun kode berubah.
- Tanpa `-d`, terminal akan attach ke log dan update-nya bukan background.

---

## 2. Alur Update dengan Migration Prisma

Kalau ada file baru di `prisma/migrations/`, kamu perlu cek dulu — tapi
**eksekusi migrasi tetap otomatis** oleh [entrypoint.sh](../docker/entrypoint.sh)
yang jalanin `prisma migrate deploy` tiap container start.

```bash
cd /opt/siap-pkl
git fetch origin

# 1. Preview: ada migration baru?
git diff --name-only HEAD origin/main -- prisma/migrations/
# Kalau output kosong → lanjut ke alur §1 (tidak perlu perlakuan khusus)

# 2. Ada migration — BACKUP DB DULU (wajib untuk migration).
mkdir -p backups
$DC exec -T db pg_dump -U siap_pkl siap_pkl | gzip \
  > backups/pre-migrate-$(date +%Y%m%d_%H%M%S).sql.gz
ls -lh backups/ | tail -3          # pastikan file ke-generate, ukuran > 0

# 3. Pull + rebuild + restart — entrypoint akan migrate deploy otomatis
git pull --ff-only origin main
$DC up -d --build app

# 4. WAJIB: verifikasi migration sukses
$DC logs --tail=80 app | grep -E "migrate|Applied|error|Error"
# Harus lihat: "X migrations found" + "Applied" / "No pending migrations"
# JANGAN ada: "P3009 failed migrations" atau "drift detected"
```

### Kalau migration gagal

Entrypoint akan `exit 1` dan container restart berulang. Cek dulu:

```bash
$DC logs --tail=100 app
```

Cari pesan error Prisma (biasanya kode `P30xx`). Opsi:

- **Migration rusak / konflik data** → lihat §4 Rollback. Jangan panik
  delete volume DB, data kamu aman di Postgres.
- **Migration butuh manual SQL dulu** → jalankan SQL manual via
  `$DC exec -T db psql -U siap_pkl siap_pkl`, lalu restart app.

---

## 3. Verifikasi Post-Update

Checklist setelah `$DC up -d --build app` kembali:

- [ ] `$DC ps` — app container Up (bukan Restarting)
- [ ] `$DC logs --tail=50 app` — tidak ada stacktrace error
- [ ] `curl -I http://127.0.0.1:${APP_PORT:-3100}` — status 200/307
- [ ] Buka `https://<domain>` di browser, login admin normal
- [ ] Smoke test fitur yang berubah di PR (feature yang baru di-merge)
- [ ] Kalau ada migration: cek tabel baru/kolom baru via
  `$DC exec -T db psql -U siap_pkl siap_pkl -c "\d <nama_tabel>"`

---

## 4. Rollback

Rollback aman di-lakukan **kalau belum ada write baru dari user** setelah
deploy. Makin lama nunggu, makin berisiko (user bisa tulis data yang
skemanya bergantung versi baru).

### 4.1 Rollback kode saja (tanpa migration baru)

```bash
cd /opt/siap-pkl

# Kembali ke commit sebelumnya
git log --oneline -5                # catat hash commit target
git reset --hard <hash-commit-sebelumnya>

# Rebuild
$DC up -d --build app
```

### 4.2 Rollback dengan migration baru

⚠️ **Rollback migration tidak otomatis.** `prisma migrate deploy` cuma
maju, tidak mundur. Dua opsi:

**Opsi A — Restore dari backup** (paling aman, rekomended):

```bash
# Stop app dulu supaya tidak ada write saat restore
$DC stop app

# Drop + recreate schema, lalu restore
$DC exec -T db psql -U siap_pkl siap_pkl -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c backups/pre-migrate-<timestamp>.sql.gz | $DC exec -T db psql -U siap_pkl siap_pkl

# Rollback kode
git reset --hard <hash-commit-sebelumnya>

# Start app (entrypoint migrate deploy akan idle karena schema sudah match)
$DC up -d --build app
```

**Opsi B — Tulis migration baru yang membalikkan** (kalau backup hilang
atau write sudah masuk): buat migration baru di dev yang reverse perubahan
(`DROP COLUMN`, `CREATE TABLE` lama, dst), push, lalu update normal via §1.
Ini bukan "rollback" teknisnya — ini "roll-forward to previous state".

---

## 5. Skenario Khusus

### 5.1 Update `.env.prod` (rotate secret, ganti domain, dll)

`.env.prod` **tidak** otomatis reload di container running. Setelah edit:

```bash
nano .env.prod
$DC up -d app                       # recreate container dengan env baru (tidak perlu --build)
```

Kalau yang berubah `AUTH_URL`, `AUTH_SECRET`: **semua user akan force-logout**
(session JWT invalid) — rencanakan di jam sepi.

### 5.2 Update dependency (package.json / package-lock.json)

Otomatis ter-handle `--build` karena Dockerfile stage `deps` akan
re-run `npm ci` saat lockfile berubah. Tidak ada langkah ekstra.

### 5.3 Update schema tanpa migration (prisma db push)

**Jangan.** `db push` hanya untuk dev. Di prod selalu pakai migration
file yang di-commit ke git — itulah yang di-deploy entrypoint.

### 5.4 Update aaPanel Nginx config (misal naikin `client_max_body_size`)

Bukan bagian dari update app — edit di aaPanel UI (Website → Config File),
Save, aaPanel auto-reload Nginx. Container app tidak perlu disentuh.

### 5.5 Skip seed saat restart (kalau seed master sudah pernah dijalankan)

Seed master idempoten (upsert), aman di-run ulang — tapi kalau mau skip:

```bash
# Sementara per-restart:
RUN_SEED_ON_START=false $DC up -d app

# Permanen: edit docker-compose.prod.aapanel.yml → RUN_SEED_ON_START: "false"
```

---

## 6. Troubleshooting

### Container app restart loop setelah update

```bash
$DC logs --tail=100 app
```

Pola error umum:

- `P1001 can't reach database` → container db belum ready. Entrypoint
  sudah retry 30 detik — kalau masih kena, cek `$DC ps` untuk status db.
- `P3009 migrate failed` → migration sebelumnya gagal dan ter-mark
  failed di tabel `_prisma_migrations`. Ikuti §4.2 Opsi A.
- `Module not found` / `Cannot find package` → build gagal atau
  lockfile tidak sinkron. Jalankan `$DC build --no-cache app` untuk
  force rebuild tanpa cache, lalu `$DC up -d app`.

### `git pull` menolak: "your local changes would be overwritten"

Seharusnya VPS **tidak pernah** punya local change. Kalau ada:

```bash
git status                          # lihat apa yang beda
git stash                           # amankan (kalau perlu)
git pull --ff-only origin main
git stash pop                       # kalau yang di-stash masih perlu
```

Kalau perubahan itu sampah / test-an lama di VPS, `git reset --hard HEAD`
dulu sebelum pull. **Jangan lakukan ini kalau kamu edit config langsung
di VPS** — commit dulu atau pindahkan ke file `.env.prod` yang di-gitignore.

### Update sudah sukses tapi browser masih tampil versi lama

Next.js tidak tua di server — ini cache browser / CDN:

- Hard refresh: Ctrl+Shift+R (atau Cmd+Shift+R di Mac)
- Cek response header: `curl -I https://<domain> -H 'Cache-Control: no-cache'`
- Kalau pakai CDN di depan aaPanel (Cloudflare dll), purge cache di sana

### Build gagal di VPS karena out of memory

VPS kecil (≤ 2 GB RAM) bisa OOM saat `next build`:

```bash
# Tambah swap sementara
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \
  && sudo mkswap /swapfile && sudo swapon /swapfile
```

Alternatif: build image di mesin dev, push ke registry (GHCR / Docker Hub),
lalu VPS cukup `$DC pull && $DC up -d app` tanpa build.

---

## 7. Cheat Sheet

```bash
# Set alias per-sesi (varian aaPanel)
export DC="docker compose -f docker-compose.prod.aapanel.yml --env-file .env.prod"

# Update standar (no schema change)
cd /opt/siap-pkl && git pull --ff-only && $DC up -d --build app

# Update dengan migration (backup dulu!)
$DC exec -T db pg_dump -U siap_pkl siap_pkl | gzip > backups/pre-migrate-$(date +%Y%m%d_%H%M%S).sql.gz
git pull --ff-only && $DC up -d --build app
$DC logs --tail=80 app | grep -i migrat

# Rollback kode (no migration)
git reset --hard <hash> && $DC up -d --build app

# Restart tanpa rebuild (misal setelah edit .env.prod)
$DC up -d app

# Status + log
$DC ps
$DC logs -f app
```
