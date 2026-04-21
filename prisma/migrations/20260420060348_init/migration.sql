-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GURU_PEMBIMBING', 'SISWA', 'DUDI');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "StatusPKL" AS ENUM ('BELUM_DAFTAR', 'MENUNGGU_KONFIRMASI', 'DITERIMA', 'SEDANG_PKL', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "StatusLowongan" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'FULL');

-- CreateEnum
CREATE TYPE "StatusPendaftaran" AS ENUM ('PENDING', 'DISETUJUI_GURU', 'DITOLAK_GURU', 'DILIHAT_DUDI', 'DITERIMA', 'DITOLAK_DUDI', 'DIBATALKAN_SISWA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PENDAFTARAN_BARU', 'STATUS_PENDAFTARAN', 'APPROVAL_DIBUTUHKAN', 'PENGUMUMAN', 'LOWONGAN_BARU', 'LOGBOOK_REVIEW', 'PENILAIAN_MASUK', 'SISTEM');

-- CreateEnum
CREATE TYPE "LogbookStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'REVISED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerified" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jabatan" TEXT,
    "nip" TEXT,
    "noHp" TEXT,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guru" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT,
    "noHp" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "mataPelajaran" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guru_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Siswa" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nis" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenisKelamin" "Gender" NOT NULL,
    "tanggalLahir" TIMESTAMP(3) NOT NULL,
    "alamat" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "noHp" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "kelas" TEXT NOT NULL,
    "jurusanId" TEXT NOT NULL,
    "nilaiRataRata" DOUBLE PRECISION,
    "guruId" TEXT,
    "jarakMaksimal" DOUBLE PRECISION,
    "bersediaKos" BOOLEAN NOT NULL DEFAULT false,
    "bidangMinat" TEXT[],
    "statusPKL" "StatusPKL" NOT NULL DEFAULT 'BELUM_DAFTAR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Siswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DUDI" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "namaPerusahaan" TEXT NOT NULL,
    "deskripsi" TEXT,
    "logoUrl" TEXT,
    "websiteUrl" TEXT,
    "alamat" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "namaPIC" TEXT NOT NULL,
    "jabatanPIC" TEXT,
    "noHpPIC" TEXT NOT NULL,
    "emailPIC" TEXT,
    "bidangUsaha" TEXT[],
    "fotoUrls" TEXT[],
    "ratingRataRata" DOUBLE PRECISION,
    "jumlahReview" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DUDI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurusan" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurusan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keahlian" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keahlian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaKeahlian" (
    "siswaId" TEXT NOT NULL,
    "keahlianId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "SiswaKeahlian_pkey" PRIMARY KEY ("siswaId","keahlianId")
);

-- CreateTable
CREATE TABLE "Dokumen" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,

    CONSTRAINT "Dokumen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaDokumen" (
    "siswaId" TEXT NOT NULL,
    "dokumenId" TEXT NOT NULL,
    "nomorDok" TEXT,
    "fileUrl" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SiswaDokumen_pkey" PRIMARY KEY ("siswaId","dokumenId")
);

-- CreateTable
CREATE TABLE "Lowongan" (
    "id" TEXT NOT NULL,
    "dudiId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "deskripsi" TEXT NOT NULL,
    "bidang" TEXT[],
    "kuotaTotal" INTEGER NOT NULL,
    "kuotaLaki" INTEGER NOT NULL,
    "kuotaPerempuan" INTEGER NOT NULL,
    "terisiLaki" INTEGER NOT NULL DEFAULT 0,
    "terisiPerempuan" INTEGER NOT NULL DEFAULT 0,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "tanggalSelesai" TIMESTAMP(3) NOT NULL,
    "nilaiMinimum" DOUBLE PRECISION,
    "uangSaku" INTEGER,
    "makanSiang" BOOLEAN NOT NULL DEFAULT false,
    "transport" BOOLEAN NOT NULL DEFAULT false,
    "fasilitasLain" TEXT,
    "jamKerja" TEXT,
    "hariKerja" TEXT,
    "dressCode" TEXT,
    "catatanKhusus" TEXT,
    "status" "StatusLowongan" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lowongan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LowonganKeahlian" (
    "lowonganId" TEXT NOT NULL,
    "keahlianId" TEXT NOT NULL,
    "levelMinimum" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "LowonganKeahlian_pkey" PRIMARY KEY ("lowonganId","keahlianId")
);

-- CreateTable
CREATE TABLE "LowonganDokumen" (
    "lowonganId" TEXT NOT NULL,
    "dokumenId" TEXT NOT NULL,
    "wajib" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LowonganDokumen_pkey" PRIMARY KEY ("lowonganId","dokumenId")
);

-- CreateTable
CREATE TABLE "Pendaftaran" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "lowonganId" TEXT NOT NULL,
    "status" "StatusPendaftaran" NOT NULL DEFAULT 'PENDING',
    "skorSAW" DOUBLE PRECISION,
    "motivasi" TEXT,
    "guruApprovalId" TEXT,
    "guruApprovedAt" TIMESTAMP(3),
    "catatanGuru" TEXT,
    "dudiReviewedAt" TIMESTAMP(3),
    "catatanDUDI" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pendaftaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendaftaranTimeline" (
    "id" TEXT NOT NULL,
    "pendaftaranId" TEXT NOT NULL,
    "status" "StatusPendaftaran" NOT NULL,
    "catatan" TEXT,
    "aktorRole" "Role" NOT NULL,
    "aktorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendaftaranTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SAWWeight" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jurusanId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "bobotBidang" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "bobotJarak" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "bobotKuota" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "bobotKeahlian" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "bobotDokumen" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "bobotFasilitas" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "bobotRating" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SAWWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logbook" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "kegiatan" TEXT NOT NULL,
    "kendala" TEXT,
    "lampiranUrls" TEXT[],
    "status" "LogbookStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewedAt" TIMESTAMP(3),
    "catatanReview" TEXT,
    "reviewerRole" "Role",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Logbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Penilaian" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "dudiId" TEXT,
    "guruId" TEXT,
    "nilaiKedisiplinan" INTEGER NOT NULL,
    "nilaiKeterampilan" INTEGER NOT NULL,
    "nilaiKerjasama" INTEGER NOT NULL,
    "nilaiInisiatif" INTEGER NOT NULL,
    "nilaiTanggungJawab" INTEGER NOT NULL,
    "nilaiRataRata" DOUBLE PRECISION NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Penilaian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDUDI" (
    "id" TEXT NOT NULL,
    "siswaId" TEXT NOT NULL,
    "dudiId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "komentar" TEXT,
    "anonim" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewDUDI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "targetRoles" "Role"[],
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "konten" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "deskripsi" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_nip_key" ON "Admin"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_userId_key" ON "Guru"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Guru_nip_key" ON "Guru"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_userId_key" ON "Siswa"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Siswa_nis_key" ON "Siswa"("nis");

-- CreateIndex
CREATE INDEX "Siswa_nis_idx" ON "Siswa"("nis");

-- CreateIndex
CREATE INDEX "Siswa_jurusanId_idx" ON "Siswa"("jurusanId");

-- CreateIndex
CREATE INDEX "Siswa_statusPKL_idx" ON "Siswa"("statusPKL");

-- CreateIndex
CREATE UNIQUE INDEX "DUDI_userId_key" ON "DUDI"("userId");

-- CreateIndex
CREATE INDEX "DUDI_namaPerusahaan_idx" ON "DUDI"("namaPerusahaan");

-- CreateIndex
CREATE UNIQUE INDEX "Jurusan_kode_key" ON "Jurusan"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Keahlian_nama_key" ON "Keahlian"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Dokumen_nama_key" ON "Dokumen"("nama");

-- CreateIndex
CREATE INDEX "Lowongan_dudiId_idx" ON "Lowongan"("dudiId");

-- CreateIndex
CREATE INDEX "Lowongan_status_idx" ON "Lowongan"("status");

-- CreateIndex
CREATE INDEX "Lowongan_tanggalMulai_idx" ON "Lowongan"("tanggalMulai");

-- CreateIndex
CREATE INDEX "Pendaftaran_status_idx" ON "Pendaftaran"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Pendaftaran_siswaId_lowonganId_key" ON "Pendaftaran"("siswaId", "lowonganId");

-- CreateIndex
CREATE INDEX "PendaftaranTimeline_pendaftaranId_idx" ON "PendaftaranTimeline"("pendaftaranId");

-- CreateIndex
CREATE UNIQUE INDEX "SAWWeight_jurusanId_isActive_key" ON "SAWWeight"("jurusanId", "isActive");

-- CreateIndex
CREATE INDEX "Logbook_siswaId_tanggal_idx" ON "Logbook"("siswaId", "tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDUDI_siswaId_dudiId_key" ON "ReviewDUDI"("siswaId", "dudiId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guru" ADD CONSTRAINT "Guru_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DUDI" ADD CONSTRAINT "DUDI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKeahlian" ADD CONSTRAINT "SiswaKeahlian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaKeahlian" ADD CONSTRAINT "SiswaKeahlian_keahlianId_fkey" FOREIGN KEY ("keahlianId") REFERENCES "Keahlian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaDokumen" ADD CONSTRAINT "SiswaDokumen_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaDokumen" ADD CONSTRAINT "SiswaDokumen_dokumenId_fkey" FOREIGN KEY ("dokumenId") REFERENCES "Dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lowongan" ADD CONSTRAINT "Lowongan_dudiId_fkey" FOREIGN KEY ("dudiId") REFERENCES "DUDI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganKeahlian" ADD CONSTRAINT "LowonganKeahlian_lowonganId_fkey" FOREIGN KEY ("lowonganId") REFERENCES "Lowongan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganKeahlian" ADD CONSTRAINT "LowonganKeahlian_keahlianId_fkey" FOREIGN KEY ("keahlianId") REFERENCES "Keahlian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganDokumen" ADD CONSTRAINT "LowonganDokumen_lowonganId_fkey" FOREIGN KEY ("lowonganId") REFERENCES "Lowongan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganDokumen" ADD CONSTRAINT "LowonganDokumen_dokumenId_fkey" FOREIGN KEY ("dokumenId") REFERENCES "Dokumen"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftaran" ADD CONSTRAINT "Pendaftaran_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftaran" ADD CONSTRAINT "Pendaftaran_lowonganId_fkey" FOREIGN KEY ("lowonganId") REFERENCES "Lowongan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pendaftaran" ADD CONSTRAINT "Pendaftaran_guruApprovalId_fkey" FOREIGN KEY ("guruApprovalId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendaftaranTimeline" ADD CONSTRAINT "PendaftaranTimeline_pendaftaranId_fkey" FOREIGN KEY ("pendaftaranId") REFERENCES "Pendaftaran"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAWWeight" ADD CONSTRAINT "SAWWeight_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Logbook" ADD CONSTRAINT "Logbook_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_dudiId_fkey" FOREIGN KEY ("dudiId") REFERENCES "DUDI"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Penilaian" ADD CONSTRAINT "Penilaian_guruId_fkey" FOREIGN KEY ("guruId") REFERENCES "Guru"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDUDI" ADD CONSTRAINT "ReviewDUDI_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDUDI" ADD CONSTRAINT "ReviewDUDI_dudiId_fkey" FOREIGN KEY ("dudiId") REFERENCES "DUDI"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
