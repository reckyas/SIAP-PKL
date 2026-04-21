-- Bidang master data + backfill dari kolom String[] lama di Siswa dan Lowongan.
-- Urutan: create tabel -> populate master dari unique value -> populate junction
-- -> drop kolom String[] lama.

-- CreateTable
CREATE TABLE "Bidang" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bidang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiswaBidangMinat" (
    "siswaId" TEXT NOT NULL,
    "bidangId" TEXT NOT NULL,

    CONSTRAINT "SiswaBidangMinat_pkey" PRIMARY KEY ("siswaId","bidangId")
);

-- CreateTable
CREATE TABLE "LowonganBidang" (
    "lowonganId" TEXT NOT NULL,
    "bidangId" TEXT NOT NULL,

    CONSTRAINT "LowonganBidang_pkey" PRIMARY KEY ("lowonganId","bidangId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bidang_nama_key" ON "Bidang"("nama");

-- CreateIndex
CREATE UNIQUE INDEX "Bidang_slug_key" ON "Bidang"("slug");

-- CreateIndex
CREATE INDEX "SiswaBidangMinat_bidangId_idx" ON "SiswaBidangMinat"("bidangId");

-- CreateIndex
CREATE INDEX "LowonganBidang_bidangId_idx" ON "LowonganBidang"("bidangId");

-- AddForeignKey
ALTER TABLE "SiswaBidangMinat" ADD CONSTRAINT "SiswaBidangMinat_siswaId_fkey" FOREIGN KEY ("siswaId") REFERENCES "Siswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiswaBidangMinat" ADD CONSTRAINT "SiswaBidangMinat_bidangId_fkey" FOREIGN KEY ("bidangId") REFERENCES "Bidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganBidang" ADD CONSTRAINT "LowonganBidang_lowonganId_fkey" FOREIGN KEY ("lowonganId") REFERENCES "Lowongan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganBidang" ADD CONSTRAINT "LowonganBidang_bidangId_fkey" FOREIGN KEY ("bidangId") REFERENCES "Bidang"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill master Bidang dari unique nilai di Siswa."bidangMinat" + Lowongan."bidang".
-- Dedup case-insensitive via LOWER(TRIM()). ID mirip cuid — pakai prefix "bid_"
-- dan md5 untuk stabilitas.
INSERT INTO "Bidang" ("id", "nama", "slug", "createdAt", "updatedAt")
SELECT
    'bid_' || substr(md5(random()::text || clock_timestamp()::text || nama), 1, 22),
    nama,
    slug,
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT ON (LOWER(TRIM(b)))
        TRIM(b) AS nama,
        LOWER(TRIM(b)) AS slug
    FROM (
        SELECT unnest("bidangMinat") AS b FROM "Siswa"
        UNION ALL
        SELECT unnest("bidang") AS b FROM "Lowongan"
    ) src
    WHERE LENGTH(TRIM(b)) > 0
) dedup;

-- Backfill junction SiswaBidangMinat.
INSERT INTO "SiswaBidangMinat" ("siswaId", "bidangId")
SELECT DISTINCT s.id, b.id
FROM "Siswa" s
CROSS JOIN LATERAL unnest(s."bidangMinat") AS bm
JOIN "Bidang" b ON b.slug = LOWER(TRIM(bm))
WHERE LENGTH(TRIM(bm)) > 0
ON CONFLICT DO NOTHING;

-- Backfill junction LowonganBidang.
INSERT INTO "LowonganBidang" ("lowonganId", "bidangId")
SELECT DISTINCT l.id, b.id
FROM "Lowongan" l
CROSS JOIN LATERAL unnest(l."bidang") AS lb
JOIN "Bidang" b ON b.slug = LOWER(TRIM(lb))
WHERE LENGTH(TRIM(lb)) > 0
ON CONFLICT DO NOTHING;

-- Drop kolom lama setelah data dipindah.
ALTER TABLE "Siswa" DROP COLUMN "bidangMinat";
ALTER TABLE "Lowongan" DROP COLUMN "bidang";
