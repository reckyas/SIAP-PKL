-- Kelas master per Jurusan, dengan enum Tingkat (X..XIII).
-- Siswa.kelas (string bebas) diganti dengan Siswa.kelasId (FK nullable
-- supaya siswa lama tidak error di migrasi — admin akan set manual via
-- CRUD Kelas). Tidak ada backfill karena data siswa masih sedikit.

-- CreateEnum
CREATE TYPE "Tingkat" AS ENUM ('X', 'XI', 'XII', 'XIII');

-- AlterTable: drop kolom kelas string, tambahkan kelasId FK nullable
ALTER TABLE "Siswa" DROP COLUMN "kelas",
ADD COLUMN     "kelasId" TEXT;

-- CreateTable
CREATE TABLE "Kelas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tingkat" "Tingkat" NOT NULL,
    "jurusanId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kelas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kelas_jurusanId_idx" ON "Kelas"("jurusanId");

-- CreateIndex
CREATE UNIQUE INDEX "Kelas_jurusanId_tingkat_nama_key" ON "Kelas"("jurusanId", "tingkat", "nama");

-- AddForeignKey
ALTER TABLE "Siswa" ADD CONSTRAINT "Siswa_kelasId_fkey" FOREIGN KEY ("kelasId") REFERENCES "Kelas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kelas" ADD CONSTRAINT "Kelas_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
