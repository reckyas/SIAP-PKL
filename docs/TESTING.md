# Checklist E2E Manual — SIAP PKL

Panduan pengujian manual end-to-end sebelum rilis. Jalankan dari database bersih:

```bash
npm run db:reset        # reset + migrate + seed master
npm run db:seed:demo    # tambah data demo
npm run dev
```

Akun demo (password semua: `Password1234`):

| Role  | Email                   |
| ----- | ----------------------- |
| Admin | `admin@siap-pkl.local`  (password dari `.env`) |
| Guru  | `guru1@demo.local`      |
| Siswa | `siswa1@demo.local` … `siswa15@demo.local` |
| DUDI  | `dudi1@demo.local` … `dudi5@demo.local` |

> Untuk pengujian import siswa, siapkan file XLSX terpisah (download template via UI admin).

---

## 1. Auth & Routing

- [ ] Login `admin@siap-pkl.local` → redirect `/admin`
- [ ] Login `guru1@demo.local` → redirect `/guru`
- [ ] Login `siswa1@demo.local` → redirect `/siswa`
- [ ] Login `dudi1@demo.local` → redirect `/dudi`
- [ ] Login password salah → error "CredentialsSignin"
- [ ] Akses `/admin` tanpa login → redirect `/login`
- [ ] Akses `/admin` sebagai SISWA → redirect / 403
- [ ] Akses `/siswa` sebagai DUDI → redirect / 403
- [ ] Akses `/guru` sebagai SISWA → redirect / 403
- [ ] Akses `/dudi` sebagai GURU → redirect / 403
- [ ] Logout dari semua role → session hilang, akses halaman terproteksi redirect `/login`
- [ ] `/register` hanya bisa daftarkan DUDI (siswa/guru di-handle admin)
- [ ] DUDI baru daftar → status `PENDING` → tidak bisa login sampai verifikasi admin

---

## 2. Admin

### 2.1 Dashboard
- [ ] Statistik siswa, guru, DUDI, lowongan tampil benar
- [ ] Link cepat berfungsi

### 2.2 Master Data — Jurusan
- [ ] List tampil semua jurusan (TBD, TKJ, RPL, MM, AKL, OTKP)
- [ ] Tambah jurusan baru — sukses
- [ ] Tambah jurusan dengan kode duplikat — ditolak
- [ ] Edit jurusan — sukses
- [ ] Hapus jurusan yang masih punya siswa → ditolak (guard FK)
- [ ] Hapus jurusan tanpa referensi → sukses

### 2.3 Master Data — Kelas
- [ ] List tampil kelas per jurusan
- [ ] Tombol "Tambah Kelas" disabled kalau belum ada jurusan → verifikasi dengan kasus bersih
- [ ] Tambah kelas baru (pilih jurusan + tingkat + nama) — sukses
- [ ] Tambah duplikat (jurusan + tingkat + nama sama) — ditolak
- [ ] Edit kelas — sukses
- [ ] Hapus kelas yang ada siswanya — ditolak
- [ ] Search by nama / kode jurusan — berfungsi

### 2.4 Master Data — Keahlian, Dokumen, Bidang
- [ ] CRUD keahlian berjalan normal
- [ ] CRUD dokumen berjalan normal
- [ ] Bidang: tambah dengan variasi case ("Web Dev" vs "web dev") → dedup otomatis lewat slug
- [ ] Hapus master yang sedang dirujuk → ditolak

### 2.5 Kelola User — Siswa
- [ ] List siswa dengan filter jurusan/kelas
- [ ] Tambah siswa single create — sukses, password default dipakai
- [ ] Tambah siswa dengan NIS duplikat — ditolak
- [ ] Edit profil siswa — sukses
- [ ] Reset password siswa — `mustChangePassword` jadi `true`
- [ ] Soft delete siswa → hilang dari list tapi pendaftaran historis tetap aman

### 2.6 Import Siswa Massal
- [ ] Klik "Download template" → XLSX ter-download, berisi header + contoh row + 3 sheet referensi + petunjuk
- [ ] Upload file kosong → error "File kosong"
- [ ] Upload non-XLSX → error "File tidak bisa dibaca"
- [ ] Upload file tanpa header lengkap → error "Header tidak lengkap"
- [ ] Upload 501 baris → error "Maksimal 500 baris"
- [ ] Upload dengan 1 email duplikat dalam file → semua gagal, tabel error tampil
- [ ] Upload dengan NIS duplikat yang sudah ada di DB → semua gagal
- [ ] Upload dengan kode jurusan tidak ada → semua gagal
- [ ] Upload dengan nama kelas tidak cocok → semua gagal
- [ ] Upload dengan `Nama Guru` yang tidak ada → semua gagal
- [ ] Upload file valid 5 siswa → sukses, semua akun `mustChangePassword: true`, password `Password1234`
- [ ] Login salah satu siswa hasil import → dipaksa ganti password

### 2.7 Kelola User — Guru
- [ ] CRUD guru — sukses
- [ ] Reset password guru — berfungsi

### 2.8 Kelola User — DUDI
- [ ] DUDI register dari `/register` muncul di daftar menunggu verifikasi
- [ ] Verifikasi DUDI → status `VERIFIED`, bisa login
- [ ] Tolak DUDI → status `REJECTED`, tidak bisa login
- [ ] Reset password DUDI — berfungsi

### 2.9 SAW Weight
- [ ] Bobot default global tampil (dari seed)
- [ ] Edit bobot global → total harus 1.0, di luar itu ditolak
- [ ] Tambah bobot per-jurusan → bobot jurusan meng-override global
- [ ] Hapus bobot jurusan → fallback ke global

### 2.10 Audit Log
- [ ] Action admin (create/update/delete master, import siswa, reset password) tercatat
- [ ] Filter by action / user berfungsi

---

## 3. Siswa

Login sebagai `siswa1@demo.local`.

### 3.1 Profil
- [ ] Data dasar (NIS, nama, kelas, jurusan) read-only — tidak bisa diubah siswa
- [ ] Isi alamat, no HP, koordinat via Leaflet → sukses
- [ ] Pilih bidang minat (multi-select) — sukses
- [ ] Tambah keahlian dengan level 1-5 — sukses
- [ ] Upload dokumen (URL) — sukses, muncul di profil

### 3.2 Lowongan
- [ ] List lowongan tampil dengan filter bidang, jurusan, DUDI
- [ ] Peta Leaflet menunjukkan lokasi DUDI
- [ ] Detail lowongan menampilkan kuota, keahlian wajib, dokumen, fasilitas
- [ ] Search berfungsi

### 3.3 Rekomendasi SAW
- [ ] Buka `/siswa/rekomendasi` → lowongan ter-rank by skor SAW
- [ ] Breakdown skor per-kriteria tampil (keahlian, jarak, bidang, dokumen, rating, kuota, fasilitas)
- [ ] Lowongan dengan jurusan target tidak memuat jurusan siswa TIDAK muncul (hard filter)
- [ ] Ubah profil (tambah keahlian) → ranking berubah

### 3.4 Pendaftaran
- [ ] Daftar ke lowongan → status awal `PENDING`, muncul di `/siswa/pendaftaran`
- [ ] Tidak bisa daftar lebih dari `MAX_PENDAFTARAN_PER_SISWA` (default 3)
- [ ] Tidak bisa daftar lowongan yang sama dua kali
- [ ] Lihat timeline pendaftaran
- [ ] Batalkan pendaftaran `PENDING` → status jadi `DIBATALKAN_SISWA`

### 3.5 Logbook
- [ ] Tambah logbook harian (draft) — sukses
- [ ] Submit logbook → status `SUBMITTED`
- [ ] Edit logbook yang sudah di-review (`REVIEWED`) — tidak bisa
- [ ] Lampirkan URL bukti kegiatan

### 3.6 Nilai & Review
- [ ] Lihat nilai akhir (kalau guru/DUDI sudah isi)
- [ ] Beri review DUDI (rating 1-5 + komentar) setelah PKL selesai
- [ ] Tidak bisa review DUDI yang sama dua kali

---

## 4. Guru Pembimbing

Login sebagai `guru1@demo.local`.

### 4.1 Siswa Bimbingan
- [ ] List siswa yang di-assign ke guru ini tampil

### 4.2 Approval Pendaftaran
- [ ] Lihat daftar pendaftaran `PENDING` dari siswa bimbingan
- [ ] Approve → status jadi `DISETUJUI_GURU`, timeline ter-update
- [ ] Tolak dengan catatan → status jadi `DITOLAK_GURU`, catatan tersimpan

### 4.3 Logbook Review
- [ ] Lihat logbook `SUBMITTED` siswa bimbingan
- [ ] Beri review + catatan → status jadi `REVIEWED`
- [ ] Minta revisi → status `REVISED`, siswa bisa edit lagi

### 4.4 Penilaian Akhir
- [ ] Input 5 komponen nilai (1-100) → `nilaiRataRata` otomatis hitung
- [ ] Tidak bisa ubah setelah submit (atau bisa — sesuai design)

---

## 5. DUDI

Login sebagai `dudi1@demo.local`.

### 5.1 Profil Perusahaan
- [ ] Edit data perusahaan, PIC, koordinat → sukses
- [ ] Upload logo & foto perusahaan

### 5.2 Kelola Lowongan
- [ ] Tambah lowongan baru dengan kuota L/P terpisah
- [ ] Pilih jurusan target (multi), bidang (multi), keahlian wajib + level min, dokumen wajib
- [ ] Set status `DRAFT` → tidak muncul di listing siswa
- [ ] Ubah status ke `OPEN` → muncul di listing & rekomendasi
- [ ] Edit lowongan yang sudah ada pendaftar — boleh (tapi hati-hati), data pendaftar tetap
- [ ] Hapus lowongan tanpa pendaftar → sukses
- [ ] Hapus lowongan dengan pendaftar → ditolak atau soft-delete (sesuai design)
- [ ] Status otomatis jadi `FULL` ketika kuota laki+perempuan terpenuhi

### 5.3 Review Pendaftar
- [ ] List pendaftar yang `DISETUJUI_GURU` + `DILIHAT_DUDI` di tab "Perlu keputusan"
- [ ] Pendaftar `PENDING` / `DITOLAK_GURU` TIDAK muncul (belum / takkan sampai DUDI)
- [ ] Klik detail → status otomatis jadi `DILIHAT_DUDI` (ada effect)
- [ ] Terima pendaftar → status `DITERIMA`, kuota L/P ter-update
- [ ] Tolak pendaftar dengan catatan → status `DITOLAK_DUDI`, kuota tidak berubah

### 5.4 Logbook
- [ ] Lihat logbook dari siswa yang diterima di lowongan DUDI ini
- [ ] Verifikasi logbook berjalan

### 5.5 Penilaian
- [ ] Input nilai siswa PKL (rata-rata otomatis)

### 5.6 Review Siswa
- [ ] Lihat review yang diberikan siswa
- [ ] `ratingRataRata` DUDI ter-update setelah review masuk

---

## 6. Integrasi Lintas-Role

Skenario end-to-end dari daftar sampai selesai PKL:

- [ ] **Siswa A** lengkapi profil penuh (alamat + koordinat + 3 keahlian + 2 dokumen + bidang minat)
- [ ] **Siswa A** lihat rekomendasi → daftar ke lowongan #1 DUDI1
- [ ] **Guru A** (pembimbing siswa A) lihat & approve pendaftaran
- [ ] Status jadi `DISETUJUI_GURU` → muncul di "Perlu keputusan" **DUDI1**
- [ ] **DUDI1** buka detail → status otomatis `DILIHAT_DUDI`
- [ ] **DUDI1** terima → status `DITERIMA`, kuota berkurang sesuai gender
- [ ] **Siswa A** isi logbook → **Guru** review → **DUDI** verifikasi
- [ ] **DUDI1** input nilai akhir untuk siswa A
- [ ] **Siswa A** lihat nilai + beri review DUDI1
- [ ] **DUDI1** melihat rating naik di profil

---

## 7. Edge Case & Regression

- [ ] Login → refresh halaman → session tetap valid (JWT)
- [ ] Admin import siswa 1 file 500 baris semua valid → berhasil dalam < 60 detik
- [ ] SAW weight diubah → rekomendasi siswa yang sama berubah ranking
- [ ] Siswa tanpa koordinat → skor jarak masih terhitung (atau fallback sesuai design)
- [ ] Lowongan dengan 0 keahlian wajib → skor keahlian = 1 (semua match)
- [ ] DUDI soft delete → lowongan-nya hilang dari listing, tapi pendaftaran historis tetap
- [ ] Middleware Edge Runtime: akses root `/` (bukan login) → redirect ke login kalau belum auth
- [ ] Force login page di saat sudah login → redirect ke dashboard sesuai role
- [ ] Error boundary: sengaja buat URL ID tidak valid (`/siswa/pendaftaran/xxx`) → 404 rapi

---

## 8. Build & Deploy Smoke Test

Sebelum merge ke main:

- [ ] `npm run lint` — 0 error
- [ ] `npm run typecheck` — 0 error
- [ ] `npm run build` — sukses tanpa warning kritis
- [ ] `npm start` (build production) → semua halaman masih berfungsi
- [ ] `docker compose -f docker-compose.prod.yml up --build` → app hidup, bisa login

---

## Catatan Penguji

Laporkan bug dengan format:

```
Role: <admin/siswa/guru/dudi>
Halaman: /path
Akun uji: <email>
Langkah:
  1. ...
  2. ...
Hasil aktual:
Hasil diharapkan:
Screenshot (opsional):
```
