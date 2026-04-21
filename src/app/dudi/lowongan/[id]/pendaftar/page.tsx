import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { STATUS_LABEL, STATUS_VARIANT } from "@/app/siswa/pendaftaran/status";

export const metadata = { title: "Pendaftar Lowongan" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DudiPendaftarPage({ params }: PageProps) {
  const session = await requireRole(["DUDI"]);
  const { id } = await params;

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) notFound();

  const lowongan = await prisma.lowongan.findUnique({
    where: { id },
    select: {
      id: true,
      dudiId: true,
      judul: true,
      kuotaTotal: true,
      terisiLaki: true,
      terisiPerempuan: true,
      status: true,
    },
  });
  if (!lowongan || lowongan.dudiId !== dudi.id) notFound();

  const pendaftaran = await prisma.pendaftaran.findMany({
    where: { lowonganId: id },
    select: {
      id: true,
      status: true,
      skorSAW: true,
      motivasi: true,
      createdAt: true,
      siswa: {
        select: {
          id: true,
          nama: true,
          nis: true,
          jenisKelamin: true,
          kelas: { select: { nama: true, tingkat: true } },
          jurusan: { select: { nama: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { skorSAW: "desc" }],
  });

  const total = lowongan.terisiLaki + lowongan.terisiPerempuan;
  const sisa = Math.max(0, lowongan.kuotaTotal - total);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Prioritas: butuh keputusan dulu, baru historis.
  const aktif = pendaftaran.filter(
    (p) => p.status === "DISETUJUI_GURU" || p.status === "DILIHAT_DUDI",
  );
  const lain = pendaftaran.filter(
    (p) =>
      p.status !== "DISETUJUI_GURU" &&
      p.status !== "DILIHAT_DUDI" &&
      p.status !== "PENDING" &&
      p.status !== "DITOLAK_GURU",
  );
  // Pendaftaran PENDING/DITOLAK_GURU tidak pernah sampai DUDI, jadi di-hide.

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dudi/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Daftar lowongan
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Pendaftar · {lowongan.judul}</h1>
        <p className="text-sm text-muted-foreground">
          Kuota {total}/{lowongan.kuotaTotal} terisi · {sisa} tersisa · status{" "}
          {lowongan.status}
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Perlu keputusan</h2>
          <Badge variant="secondary">{aktif.length}</Badge>
        </div>
        {aktif.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada pendaftar yang sudah disetujui guru.
            </CardContent>
          </Card>
        ) : (
          aktif.map((p) => (
            <PendaftarCard key={p.id} p={p} fmt={fmt} />
          ))
        )}
      </section>

      {lain.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Riwayat</h2>
            <Badge variant="outline">{lain.length}</Badge>
          </div>
          {lain.map((p) => (
            <PendaftarCard key={p.id} p={p} fmt={fmt} />
          ))}
        </section>
      )}
    </div>
  );
}

type PendaftarRow = {
  id: string;
  status: import("@prisma/client").StatusPendaftaran;
  skorSAW: number | null;
  motivasi: string | null;
  createdAt: Date;
  siswa: {
    id: string;
    nama: string;
    nis: string;
    jenisKelamin: import("@prisma/client").Gender;
    kelas: { nama: string; tingkat: import("@prisma/client").Tingkat } | null;
    jurusan: { nama: string };
  };
};

function PendaftarCard({
  p,
  fmt,
}: {
  p: PendaftarRow;
  fmt: Intl.DateTimeFormat;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <CardTitle className="text-base">
              {p.siswa.nama}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                ({p.siswa.jenisKelamin === "LAKI_LAKI" ? "L" : "P"})
              </span>
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {p.siswa.nis}
                {p.siswa.kelas
                  ? ` · ${p.siswa.kelas.tingkat} ${p.siswa.kelas.nama}`
                  : ""}{" "}
                {p.siswa.jurusan.nama}
              </span>
              {p.skorSAW !== null && (
                <span>Skor SAW {(p.skorSAW * 100).toFixed(2)}</span>
              )}
              <span>Daftar {fmt.format(p.createdAt)}</span>
            </CardDescription>
          </div>
          <Badge variant={STATUS_VARIANT[p.status]}>
            {STATUS_LABEL[p.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {p.motivasi && (
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Motivasi
            </div>
            <p className="line-clamp-3 whitespace-pre-wrap">{p.motivasi}</p>
          </div>
        )}
        <div className="flex justify-end">
          <Button asChild size="sm" variant="outline">
            <Link href={`/dudi/pendaftaran/${p.id}`}>Lihat detail</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
