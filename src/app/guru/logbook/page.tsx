import Link from "next/link";
import { GraduationCap } from "lucide-react";
import type { LogbookStatus } from "@prisma/client";

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
import {
  LOGBOOK_STATUS_LABEL,
  LOGBOOK_STATUS_VARIANT,
} from "@/lib/logbook";

export const metadata = { title: "Logbook Siswa Bimbingan" };

const FILTERS: { value: "pending" | "done" | "all"; label: string }[] = [
  { value: "pending", label: "Butuh review" },
  { value: "done", label: "Sudah diputuskan" },
  { value: "all", label: "Semua" },
];

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function GuruLogbookPage({ searchParams }: PageProps) {
  const session = await requireRole(["GURU_PEMBIMBING"]);
  const { filter: rawFilter } = await searchParams;
  const filter: "pending" | "done" | "all" =
    rawFilter === "done" || rawFilter === "all" ? rawFilter : "pending";

  const guru = await prisma.guru.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!guru) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil guru belum tersedia</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const statusWhere: { status?: { in: LogbookStatus[] } } =
    filter === "pending"
      ? { status: { in: ["SUBMITTED"] } }
      : filter === "done"
        ? { status: { in: ["REVIEWED", "REVISED"] } }
        : {};

  const logbook = await prisma.logbook.findMany({
    where: {
      siswa: { guruId: guru.id },
      ...statusWhere,
    },
    select: {
      id: true,
      tanggal: true,
      kegiatan: true,
      status: true,
      updatedAt: true,
      siswa: {
        select: {
          nama: true,
          nis: true,
          jurusan: { select: { nama: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { tanggal: "desc" }],
  });

  const pendingCount = await prisma.logbook.count({
    where: {
      siswa: { guruId: guru.id },
      status: "SUBMITTED",
    },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logbook Siswa Bimbingan</h1>
        <p className="text-sm text-muted-foreground">
          Review catatan harian PKL siswa yang Anda bimbing.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            asChild
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
          >
            <Link
              href={
                f.value === "pending"
                  ? "/guru/logbook"
                  : `/guru/logbook?filter=${f.value}`
              }
            >
              {f.label}
              {f.value === "pending" && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {pendingCount}
                </Badge>
              )}
            </Link>
          </Button>
        ))}
      </div>

      {logbook.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada logbook di filter ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {logbook.map((l) => (
            <Link
              key={l.id}
              href={`/guru/logbook/${l.id}`}
              className="block rounded-lg border bg-card p-4 transition hover:bg-accent"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <CardTitle className="text-base">
                    {fmt.format(l.tanggal)}
                  </CardTitle>
                  <CardDescription className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {l.siswa.nama} · {l.siswa.nis} · {l.siswa.jurusan.nama}
                  </CardDescription>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {l.kegiatan}
                  </p>
                </div>
                <Badge variant={LOGBOOK_STATUS_VARIANT[l.status]}>
                  {LOGBOOK_STATUS_LABEL[l.status]}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
