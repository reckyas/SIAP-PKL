# Deploy SIAP PKL ke VPS

Panduan ini meng-cover deployment ke VPS Linux (Ubuntu 22.04+) pakai **Docker Compose + Nginx reverse proxy + HTTPS Let's Encrypt**.

Arsitektur jalan di-produksi:

```
    Internet
        │ (80/443)
   ┌────▼─────┐
   │  Nginx   │  (container: siap-pkl-nginx)
   └────┬─────┘
        │ http://app:3000 (internal)
   ┌────▼─────┐
   │ Next.js  │  (container: siap-pkl-app, standalone build)
   └────┬─────┘
        │ postgres://db:5432 (internal)
   ┌────▼─────┐
   │ Postgres │  (container: siap-pkl-db, volume persistent)
   └──────────┘
```

---

## 1. Prasyarat

### 1.1 VPS
- Ubuntu 22.04+ (atau distro Linux serupa)
- RAM minimal 2 GB (rekomendasi 4 GB — Next build perlu memory)
- Disk 20 GB+
- Public IPv4 address

### 1.2 Domain
- Domain aktif (misal `siap-pkl.smkn1badegan.sch.id`)
- A record menunjuk ke IP VPS — verifikasi dengan:
  ```bash
  dig +short siap-pkl.smkn1badegan.sch.id
  ```

### 1.3 Software di VPS
Install Docker & Docker Compose plugin:

```bash
# Docker official repo
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout-login ulang supaya group kena

# Verifikasi
docker --version
docker compose version
```

---

## 2. Clone Repo & Konfigurasi Environment

```bash
cd /opt
sudo git clone <repo-url> siap-pkl
sudo chown -R $USER:$USER /opt/siap-pkl
cd /opt/siap-pkl
```

Buat file env produksi:

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Isi wajib:

| Variable | Nilai |
| -------- | ----- |
| `POSTGRES_PASSWORD` | password DB minimal 24 karakter acak |
| `AUTH_SECRET` | hasil `openssl rand -base64 32` |
| `AUTH_URL` | `https://<domain-kamu>` (harus match, dipakai Auth.js) |
| `SEED_ADMIN_EMAIL` | email admin pertama |
| `SEED_ADMIN_PASSWORD` | password admin kuat (harus diganti setelah login) |

---

## 3. Konfigurasi Nginx (Domain)

Edit [nginx/conf.d/siap-pkl.conf](../nginx/conf.d/siap-pkl.conf), ganti `siap-pkl.example.com` ke domain kamu di semua tempat:

```bash
sed -i 's/siap-pkl\.example\.com/siap-pkl.smkn1badegan.sch.id/g' nginx/conf.d/siap-pkl.conf
```

### 3.1 Mode Bootstrap (HTTP-only)

File config default sekarang di mode **Production (HTTPS)** — tapi cert belum ada. Untuk bootstrap, comment blok Production dan uncomment blok Bootstrap di atasnya.

Cara paling cepat: pakai config bootstrap sementara. Buat backup dulu:

```bash
cp nginx/conf.d/siap-pkl.conf nginx/conf.d/siap-pkl.conf.prod
```

Lalu ganti isinya dengan config bootstrap minimal:

```nginx
# nginx/conf.d/siap-pkl.conf (bootstrap mode)
server {
  listen 80;
  server_name siap-pkl.smkn1badegan.sch.id;

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    proxy_pass http://app:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 4. First Boot & Issue SSL Certificate

### 4.1 Build & start stack (mode HTTP)

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Verifikasi:

```bash
docker compose -f docker-compose.prod.yml ps
# Harus 4 container UP (db, app, nginx, certbot)

docker compose -f docker-compose.prod.yml logs -f app
# Tunggu log: "[entrypoint] Menjalankan aplikasi..."
```

Test di browser: `http://siap-pkl.smkn1badegan.sch.id` — halaman login muncul.

### 4.2 Issue cert via Certbot

Jalankan certbot dalam mode `webroot` (via container certbot):

```bash
docker compose -f docker-compose.prod.yml run --rm certbot \
  certonly --webroot -w /var/www/certbot \
  -d siap-pkl.smkn1badegan.sch.id \
  --email [email protected] \
  --agree-tos --no-eff-email
```

Kalau sukses, akan tampil:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/siap-pkl.smkn1badegan.sch.id/fullchain.pem
```

### 4.3 Aktifkan HTTPS

Kembalikan config production:

```bash
mv nginx/conf.d/siap-pkl.conf.prod nginx/conf.d/siap-pkl.conf
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Test HTTPS: `https://siap-pkl.smkn1badegan.sch.id` — gembok hijau.

---

## 5. Auto-Renewal Certificate

Let's Encrypt berlaku 90 hari — auto-renew via cron host:

```bash
sudo crontab -e
```

Tambahkan:

```
# Renewal SSL SIAP PKL (jam 03:00 tiap hari; certbot akan skip kalau belum mendekati expired)
0 3 * * * cd /opt/siap-pkl && docker compose -f docker-compose.prod.yml run --rm certbot renew --quiet && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

Test renewal dry-run:

```bash
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## 6. Operasional

### 6.1 Login pertama

1. Buka `https://<domain>/login`
2. Login dengan `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` dari `.env.prod`
3. **Segera ganti password admin** di menu profil

### 6.2 Cek status

```bash
# Status semua container
docker compose -f docker-compose.prod.yml ps

# Log real-time
docker compose -f docker-compose.prod.yml logs -f app
docker compose -f docker-compose.prod.yml logs -f nginx

# Resource usage
docker stats
```

### 6.3 Update aplikasi (new version)

Alur singkat (perubahan kode tanpa migration):

```bash
cd /opt/siap-pkl
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build app
# Migrate deploy jalan otomatis di entrypoint
```

➡️ **Untuk alur lengkap** (update dengan migration Prisma, rollback,
backup pre-migrate, troubleshooting build OOM) lihat [UPDATE.md](UPDATE.md).

### 6.4 Seed demo data (opsional, HANYA di staging)

Jangan jalankan di produksi:

```bash
docker compose -f docker-compose.prod.yml exec app npx tsx prisma/seed-demo.ts
```

### 6.5 Akses shell container

```bash
# App
docker compose -f docker-compose.prod.yml exec app sh

# DB (psql)
docker compose -f docker-compose.prod.yml exec db psql -U siap_pkl -d siap_pkl
```

---

## 7. Backup & Restore Database

### 7.1 Backup manual

```bash
cd /opt/siap-pkl
mkdir -p backups
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U siap_pkl siap_pkl | gzip > backups/siap_pkl_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 7.2 Backup otomatis (cron)

```
# Backup harian jam 02:00, simpan 30 hari terakhir
0 2 * * * cd /opt/siap-pkl && docker compose -f docker-compose.prod.yml exec -T db pg_dump -U siap_pkl siap_pkl | gzip > backups/siap_pkl_$(date +\%Y\%m\%d).sql.gz && find backups -type f -mtime +30 -delete
```

### 7.3 Restore

```bash
gunzip -c backups/siap_pkl_20260420.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U siap_pkl -d siap_pkl
```

---

## 8. Troubleshooting

### 502 Bad Gateway dari Nginx
- Cek container app hidup: `docker compose -f docker-compose.prod.yml ps`
- Cek log app: `docker compose -f docker-compose.prod.yml logs app | tail -50`
- Kemungkinan migrate gagal → cek `DATABASE_URL` di `.env.prod`

### "AUTH_URL mismatch" / redirect loop saat login
- `AUTH_URL` di `.env.prod` harus persis `https://<domain>` (tanpa trailing slash)
- Restart app: `docker compose -f docker-compose.prod.yml restart app`

### Certbot gagal issue cert (timeout)
- Verifikasi DNS: `dig +short <domain>` harus return IP VPS
- Firewall VPS buka port 80 & 443: `sudo ufw allow 80 && sudo ufw allow 443`
- Cek nginx accessible dari luar: `curl -I http://<domain>/.well-known/acme-challenge/test`

### Database persistent data hilang setelah `docker compose down -v`
- `-v` menghapus volume. **Jangan pakai di produksi.**
- Untuk stop tanpa hapus data: `docker compose -f docker-compose.prod.yml down` (tanpa `-v`)

### App out of memory saat `docker compose up --build`
- Next build butuh RAM minimal 2 GB. Tambah swap:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

---

## 9. Hardening (Rekomendasi)

- [ ] Firewall (ufw) hanya allow 22 (SSH), 80, 443
- [ ] Disable root SSH login, pakai key-based auth
- [ ] Fail2ban untuk brute-force protection
- [ ] Postgres password rotation tiap 6 bulan
- [ ] `AUTH_SECRET` rotation tiap 12 bulan (invalidate semua session aktif)
- [ ] Monitor disk space volume `siap_pkl_db_data` — alert kalau >80% penuh
- [ ] Offsite backup mingguan ke S3/Google Drive/rclone target
