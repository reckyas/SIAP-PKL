-- Hapus kolom nilaiRataRata dari Siswa (tidak terpakai — beda dengan
-- Penilaian.nilaiRataRata yang memang nilai hasil PKL).
ALTER TABLE "Siswa" DROP COLUMN "nilaiRataRata";
