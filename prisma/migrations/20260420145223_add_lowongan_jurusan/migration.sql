-- CreateTable
CREATE TABLE "LowonganJurusan" (
    "lowonganId" TEXT NOT NULL,
    "jurusanId" TEXT NOT NULL,

    CONSTRAINT "LowonganJurusan_pkey" PRIMARY KEY ("lowonganId","jurusanId")
);

-- CreateIndex
CREATE INDEX "LowonganJurusan_jurusanId_idx" ON "LowonganJurusan"("jurusanId");

-- AddForeignKey
ALTER TABLE "LowonganJurusan" ADD CONSTRAINT "LowonganJurusan_lowonganId_fkey" FOREIGN KEY ("lowonganId") REFERENCES "Lowongan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LowonganJurusan" ADD CONSTRAINT "LowonganJurusan_jurusanId_fkey" FOREIGN KEY ("jurusanId") REFERENCES "Jurusan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
