import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { SiswaForm, type SiswaFormDefaults } from "../../siswa-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Edit Siswa" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiswaEditPage({ params }: PageProps) {
  const { id } = await params;

  const [siswa, jurusan, kelas, guru] = await Promise.all([
    prisma.siswa.findUnique({
      where: { id },
      select: {
        id: true,
        nis: true,
        nama: true,
        jenisKelamin: true,
        tanggalLahir: true,
        alamat: true,
        latitude: true,
        longitude: true,
        noHp: true,
        kelasId: true,
        jurusanId: true,
        guruId: true,
        user: { select: { email: true } },
      },
    }),
    prisma.jurusan.findMany({
      select: { id: true, kode: true, nama: true },
      orderBy: { kode: "asc" },
    }),
    prisma.kelas.findMany({
      select: { id: true, nama: true, tingkat: true, jurusanId: true },
      orderBy: [{ tingkat: "asc" }, { nama: "asc" }],
    }),
    prisma.guru.findMany({
      where: { user: { deletedAt: null } },
      select: { id: true, nama: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  if (!siswa) notFound();

  const defaults: SiswaFormDefaults = {
    email: siswa.user.email,
    nis: siswa.nis,
    nama: siswa.nama,
    jenisKelamin: siswa.jenisKelamin,
    tanggalLahir: toDateInput(siswa.tanggalLahir),
    alamat: siswa.alamat,
    latitude: siswa.latitude,
    longitude: siswa.longitude,
    noHp: siswa.noHp,
    kelasId: siswa.kelasId ?? "",
    jurusanId: siswa.jurusanId,
    guruId: siswa.guruId,
  };

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/siswa">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Edit Siswa</CardTitle>
          <CardDescription>
            Perbarui data siswa {siswa.nama}. NIS & email bisa diubah, tapi
            pastikan tidak berbenturan dengan data lain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiswaForm
            mode="edit"
            siswaId={siswa.id}
            defaults={defaults}
            jurusan={jurusan}
            kelas={kelas}
            guru={guru}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function toDateInput(d: Date): string {
  // yyyy-mm-dd
  return d.toISOString().slice(0, 10);
}
