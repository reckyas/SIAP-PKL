# Deploy SIAP PKL via aaPanel

Varian deploy untuk VPS yang sudah pakai **aaPanel** sebagai control panel. aaPanel meng-handle Nginx + Let's Encrypt via UI; compose kita cukup jalankan `db` + `app`.

Arsitektur:

```
   Internet
       │ (80/443)
  ┌────▼─────────────┐
  │ Nginx (aaPanel)  │  managed via aaPanel UI + SSL auto-renew
  └────┬─────────────┘
       │ http://127.0.0.1:3000  (loopback)
  ┌────▼─────┐
  │ Next.js  │  container: siap-pkl-app
  └────┬─────┘
       │ postgres://db:5432 (internal network)
  ┌────▼─────┐
  │ Postgres │  container: siap-pkl-db
  └──────────┘
```

Kalau VPS kamu **belum** pakai aaPanel, ikuti [DEPLOY.md](DEPLOY.md) (pakai Nginx containerized).

---

## 1. Prasyarat

- aaPanel sudah terinstall & bisa diakses (biasanya di `https://<ip>:8888`)
- Domain diarahkan ke IP VPS (A record)
- Docker terinstall di VPS — kalau belum, install via:
  - **aaPanel App Store** → cari "Docker Manager" → Install, atau
  - Manual: `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER`

---

## 2. Deploy Aplikasi (Docker Compose)

### 2.1 Clone repo

Login SSH ke VPS:

```bash
cd /opt
sudo git clone <repo-url> siap-pkl
sudo chown -R $USER:$USER /opt/siap-pkl
cd /opt/siap-pkl
```

### 2.2 Konfigurasi env

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Isi wajib (lihat [.env.prod.example](../.env.prod.example)):

| Variable | Nilai |
| -------- | ----- |
| `POSTGRES_PASSWORD` | password DB acak ≥ 24 karakter |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `https://<domain-kamu>` — **harus HTTPS**, persis match domain aaPanel |
| `SEED_ADMIN_EMAIL` | email admin |
| `SEED_ADMIN_PASSWORD` | password admin kuat |

### 2.3 Build & jalankan

```bash
docker compose -f docker-compose.prod.aapanel.yml --env-file .env.prod up -d --build
```

Verifikasi 2 container UP:

```bash
docker compose -f docker-compose.prod.aapanel.yml ps
# siap-pkl-db    Up (healthy)
# siap-pkl-app   Up
```

Test app dari host (sebelum setup Nginx):

```bash
curl -I http://127.0.0.1:3000
# HTTP/1.1 200 OK (atau 307 redirect ke /login)
```

---

## 3. Setup Site di aaPanel

### 3.1 Tambah Website

Buka aaPanel UI → **Website** → **Add site**:

| Field | Nilai |
| ----- | ----- |
| Domain | `siap-pkl.smkn1badegan.sch.id` (domain kamu) |
| Root directory | biarkan default (aaPanel akan bikin folder, tidak kita pakai) |
| PHP Version | **Pure static** atau "No PHP" |
| Database | **Tidak perlu** (kita pakai Postgres di container) |

Klik **Submit**. aaPanel bikin config Nginx dasar.

### 3.2 Set Reverse Proxy

Masih di aaPanel UI:

1. Klik domain → **Reverse proxy** (atau "Proxy" di beberapa versi aaPanel)
2. Klik **Add reverse proxy**:

   | Field | Nilai |
   | ----- | ----- |
   | Proxy name | `siap-pkl` |
   | Target URL | `http://127.0.0.1:3000` |
   | Send domain | `$host` (default) |
   | Content substitution | **Off** |
   | Cache | **Off** |

3. Submit.

### 3.3 Tambah Proxy Headers (PENTING)

Auth.js v5 butuh `X-Forwarded-Proto=https` untuk set cookie secure. aaPanel reverse proxy default tidak selalu set header ini — cek dan tambah manual:

1. Website → klik domain → **Config File** (atau "Configuration")
2. Cari blok `location / { ... }` hasil reverse proxy
3. Pastikan ada:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3000;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;     # ← WAJIB
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";

       # Import siswa bisa sampai 5MB — beri margin.
       client_max_body_size 10M;

       proxy_read_timeout 60s;
       proxy_connect_timeout 10s;
   }
   ```

4. Save → aaPanel auto-reload Nginx.

---

## 4. Apply SSL (Let's Encrypt)

Di aaPanel → website → tab **SSL**:

1. Pilih **Let's Encrypt** (bukan "Self-signed")
2. Centang domain-nya (apex + `www` kalau perlu)
3. Klik **Apply**

Tunggu ~30 detik, aaPanel akan:
- Issue cert via ACME
- Update config Nginx pakai cert
- Enable "Force HTTPS" (redirect HTTP → HTTPS)

**Pastikan "Force HTTPS" aktif** (toggle di tab SSL). Kalau tidak, cookie session Auth.js bisa ter-leak di koneksi HTTP.

### Cek renewal
aaPanel auto-renew Let's Encrypt tiap 60 hari via cron internal — tidak perlu setup tambahan. Cek di **Cron** tab: harus ada entry "Let's Encrypt renewal".

---

## 5. Verifikasi Production

- [ ] Buka `https://<domain>` → halaman login muncul
- [ ] Gembok hijau di browser (cert valid)
- [ ] Login admin pakai kredensial `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- [ ] Ganti password admin segera
- [ ] Test redirect HTTP: `curl -I http://<domain>` harus 301 → HTTPS

---

## 6. Operasional

### Update aplikasi

Alur singkat (perubahan kode tanpa migration):

```bash
cd /opt/siap-pkl
git pull --ff-only origin main
docker compose -f docker-compose.prod.aapanel.yml --env-file .env.prod up -d --build app
```

aaPanel Nginx tidak perlu disentuh — target `127.0.0.1:<APP_PORT>` tetap sama.

➡️ **Untuk alur lengkap** (update dengan migration Prisma, rollback, backup
pre-migrate, troubleshooting build) lihat [UPDATE.md](UPDATE.md).

### Cek log app

```bash
docker compose -f docker-compose.prod.aapanel.yml logs -f app
```

Atau via aaPanel → Docker → Containers → `siap-pkl-app` → Logs.

### Backup DB

```bash
mkdir -p /opt/siap-pkl/backups
docker compose -f docker-compose.prod.aapanel.yml exec -T db \
  pg_dump -U siap_pkl siap_pkl | gzip > /opt/siap-pkl/backups/siap_pkl_$(date +%Y%m%d_%H%M%S).sql.gz
```

Jadwalkan via aaPanel → **Cron** → Add task:
- Type: Shell script
- Schedule: `0 2 * * *`
- Script:
  ```bash
  cd /opt/siap-pkl && docker compose -f docker-compose.prod.aapanel.yml exec -T db pg_dump -U siap_pkl siap_pkl | gzip > backups/siap_pkl_$(date +\%Y\%m\%d).sql.gz && find backups -type f -mtime +30 -delete
  ```

---

## 7. Troubleshooting

### 502 Bad Gateway saat buka domain
- Cek app container: `docker compose -f docker-compose.prod.aapanel.yml ps`
- Cek port binding: `ss -tlnp | grep 3000` harus tampil `127.0.0.1:3000`
- Cek aaPanel Nginx error log: Website → Log → Error log

### Login redirect loop / session hilang
- `X-Forwarded-Proto $scheme` belum di-set di config Nginx (lihat §3.3)
- `AUTH_URL` di `.env.prod` tidak match domain (harus persis `https://<domain>` tanpa trailing slash)
- Restart app: `docker compose -f docker-compose.prod.aapanel.yml restart app`

### SSL apply gagal di aaPanel
- DNS belum propagate: `dig +short <domain>` harus return IP VPS
- aaPanel Nginx listen port 80: pastikan tidak ada yang bentrok (`ss -tlnp | grep :80`)
- Firewall aaPanel: Security → port 80 & 443 open

### "Mixed content" warning (asset HTTP di halaman HTTPS)
- Cek `AUTH_URL` = HTTPS, bukan HTTP
- Cek `trustHost` di Auth config (sudah di-handle via `AUTH_TRUST_HOST=true` di compose)

---

## 8. Kalau Mau Pindah ke Varian Containerized Nginx

Kalau suatu saat mau lepas dari aaPanel (atau pindah VPS tanpa aaPanel):
1. Disable site di aaPanel (tab Website → toggle off)
2. Stop app: `docker compose -f docker-compose.prod.aapanel.yml down`
3. Ubah `app` service di `docker-compose.prod.yml` → port binding `127.0.0.1:3000:3000` diganti tanpa loopback kalau nginx di host, **atau** langsung pakai [docker-compose.prod.yml](../docker-compose.prod.yml) yang sudah include nginx+certbot
4. Follow [DEPLOY.md](DEPLOY.md)

Database volume `siap_pkl_db_data` tetap persistent antara dua compose file (nama sama).
