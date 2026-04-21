import Link from "next/link";
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
import { LowonganForm } from "../lowongan-form";

export const metadata = { title: "Lowongan Baru" };

export default async function LowonganBaruPage() {
  await requireRole(["DUDI"]);

  const [keahlianMaster, dokumenMaster, jurusanMaster, bidangMaster] =
    await Promise.all([
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

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dudi/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Lowongan Baru</h1>
        <p className="text-sm text-muted-foreground">
          Isi detail lowongan. Akan tersimpan sebagai DRAFT — publikasi via
          menu aksi di daftar lowongan.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Formulir Lowongan</CardTitle>
          <CardDescription>
            Lengkapi semua bagian untuk memudahkan siswa memilih.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LowonganForm
            mode="create"
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
