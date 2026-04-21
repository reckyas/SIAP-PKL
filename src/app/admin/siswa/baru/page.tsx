import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { SiswaForm } from "../siswa-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Tambah Siswa" };

export default async function SiswaBaruPage() {
  const [jurusan, kelas, guru] = await Promise.all([
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
          <CardTitle>Tambah Siswa</CardTitle>
          <CardDescription>
            Buat akun siswa lengkap dengan data diri & akademik. Password awal
            default = NIS; siswa wajib ganti password saat login pertama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiswaForm mode="create" jurusan={jurusan} kelas={kelas} guru={guru} />
        </CardContent>
      </Card>
    </div>
  );
}
