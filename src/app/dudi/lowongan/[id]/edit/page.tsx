import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { LowonganForm } from "../../lowongan-form";

export const metadata = { title: "Edit Lowongan" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditLowonganPage({ params }: PageProps) {
  const session = await requireRole(["DUDI"]);
  const { id } = await params;

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) notFound();

  const [lowongan, keahlianMaster, dokumenMaster, jurusanMaster, bidangMaster] =
    await Promise.all([
      prisma.lowongan.findUnique({
        where: { id },
        select: {
          id: true,
          dudiId: true,
          judul: true,
          deskripsi: true,
          bidang: { select: { bidangId: true } },
          kuotaTotal: true,
          kuotaLaki: true,
          kuotaPerempuan: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          nilaiMinimum: true,
          uangSaku: true,
          makanSiang: true,
          transport: true,
          fasilitasLain: true,
          jamKerja: true,
          hariKerja: true,
          dressCode: true,
          catatanKhusus: true,
          status: true,
          keahlianDibutuhkan: {
            select: { keahlianId: true, levelMinimum: true },
          },
          dokumenDibutuhkan: {
            select: { dokumenId: true, wajib: true },
          },
          jurusanTarget: {
            select: { jurusanId: true },
          },
        },
      }),
      prisma.keahlian.findMany({
        orderBy: [{ kategori: "asc" }, { nama: "asc" }],
        select: { id: true, nama: true, kategori: true },
      }),
      prisma.dokumen.findMany({
        orderBy: { nama: "asc" },
        select: { id: true, nama: true },
      }),
      prisma.jurusan.findMany({
        orderBy: { nama: "asc" },
        select: { id: true, kode: true, nama: true },
      }),
      prisma.bidang.findMany({
        orderBy: { nama: "asc" },
        select: { id: true, nama: true, slug: true },
      }),
    ]);

  if (!lowongan || lowongan.dudiId !== dudi.id) notFound();
  if (lowongan.status === "CLOSED") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lowongan sudah ditutup</CardTitle>
          <CardDescription>
            Lowongan berstatus CLOSED tidak bisa diedit lagi.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dudi/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Edit Lowongan</h1>
        <p className="text-sm text-muted-foreground">{lowongan.judul}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Formulir Lowongan</CardTitle>
          <CardDescription>
            Perubahan akan mempengaruhi tampilan untuk siswa jika status
            lowongan sudah Terbuka.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LowonganForm
            mode="edit"
            lowonganId={lowongan.id}
            defaults={{
              judul: lowongan.judul,
              deskripsi: lowongan.deskripsi,
              bidang: lowongan.bidang.map((b) => b.bidangId),
              jurusanIds: lowongan.jurusanTarget.map((j) => j.jurusanId),
              kuotaTotal: lowongan.kuotaTotal,
              kuotaLaki: lowongan.kuotaLaki,
              kuotaPerempuan: lowongan.kuotaPerempuan,
              tanggalMulai: lowongan.tanggalMulai,
              tanggalSelesai: lowongan.tanggalSelesai,
              keahlianDibutuhkan: lowongan.keahlianDibutuhkan.map((k) => ({
                keahlianId: k.keahlianId,
                levelMinimum: k.levelMinimum,
              })),
              dokumenDibutuhkan: lowongan.dokumenDibutuhkan.map((d) => ({
                dokumenId: d.dokumenId,
                wajib: d.wajib,
              })),
              nilaiMinimum: lowongan.nilaiMinimum,
              uangSaku: lowongan.uangSaku,
              makanSiang: lowongan.makanSiang,
              transport: lowongan.transport,
              fasilitasLain: lowongan.fasilitasLain ?? "",
              jamKerja: lowongan.jamKerja ?? "",
              hariKerja: lowongan.hariKerja ?? "",
              dressCode: lowongan.dressCode ?? "",
              catatanKhusus: lowongan.catatanKhusus ?? "",
            }}
            keahlianMaster={keahlianMaster}
            dokumenMaster={dokumenMaster}
            jurusanMaster={jurusanMaster}
            bidangMaster={bidangMaster}
          />
        </CardContent>
      </Card>
    </div>
  );
}
