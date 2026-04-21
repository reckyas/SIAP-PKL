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
import { upsertPenilaianGuruAction } from "../actions";
import { PenilaianForm } from "../penilaian-form";

export const metadata = { title: "Beri Nilai" };

interface PageProps {
  params: Promise<{ siswaId: string }>;
}

export default async function GuruPenilaianForm({ params }: PageProps) {
  const session = await requireRole(["GURU_PEMBIMBING"]);
  const { siswaId } = await params;

  const guru = await prisma.guru.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!guru) notFound();

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    select: {
      id: true,
      nama: true,
      nis: true,
      guruId: true,
      statusPKL: true,
      jurusan: { select: { nama: true } },
      penilaianDiterima: {
        where: { guruId: guru.id },
        select: {
          nilaiKedisiplinan: true,
          nilaiKeterampilan: true,
          nilaiKerjasama: true,
          nilaiInisiatif: true,
          nilaiTanggungJawab: true,
          catatan: true,
        },
        take: 1,
      },
    },
  });
  if (!siswa || siswa.guruId !== guru.id) notFound();

  if (siswa.statusPKL !== "SELESAI") {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/guru/penilaian">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>PKL belum selesai</CardTitle>
            <CardDescription>
              Nilai akhir hanya bisa diberikan setelah siswa menandai PKL
              selesai.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const existing = siswa.penilaianDiterima[0];
  const defaults = {
    siswaId: siswa.id,
    nilaiKedisiplinan: existing?.nilaiKedisiplinan ?? 80,
    nilaiKeterampilan: existing?.nilaiKeterampilan ?? 80,
    nilaiKerjasama: existing?.nilaiKerjasama ?? 80,
    nilaiInisiatif: existing?.nilaiInisiatif ?? 80,
    nilaiTanggungJawab: existing?.nilaiTanggungJawab ?? 80,
    catatan: existing?.catatan ?? "",
  };

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/guru/penilaian">
            <ChevronLeft className="h-4 w-4" />
            Daftar siswa
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">
          {existing ? "Edit nilai" : "Beri nilai"} — {siswa.nama}
        </h1>
        <p className="text-sm text-muted-foreground">
          {siswa.nis} · {siswa.jurusan.nama}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nilai 5 aspek</CardTitle>
          <CardDescription>
            Masukkan nilai 0-100 untuk tiap aspek. Rata-rata dihitung otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PenilaianForm
            mode={existing ? "edit" : "create"}
            defaults={defaults}
            action={upsertPenilaianGuruAction}
            redirectPath="/guru/penilaian"
          />
        </CardContent>
      </Card>
    </div>
  );
}
