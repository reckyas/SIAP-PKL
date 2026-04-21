import Link from "next/link";
import { Building2, GraduationCap } from "lucide-react";
import type { StatusPendaftaran } from "@prisma/client";

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
import { GuruDecisionDialog } from "./guru-decision-dialog";

export const metadata = { title: "Pendaftaran Siswa Bimbingan" };

const FILTERS: { value: "all" | "pending" | "done"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Butuh keputusan" },
  { value: "done", label: "Sudah diputuskan" },
];

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function GuruPendaftaranPage({ searchParams }: PageProps) {
  const session = await requireRole(["GURU_PEMBIMBING"]);
  const { filter: rawFilter } = await searchParams;
  const filter: "all" | "pending" | "done" =
    rawFilter === "pending" || rawFilter === "done" ? rawFilter : "all";

  const guru = await prisma.guru.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!guru) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil guru belum tersedia</CardTitle>
          <CardDescription>
            Hubungi admin untuk melengkapi data guru.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const statusWhere: { status?: { in: StatusPendaftaran[] } } =
    filter === "pending"
      ? { status: { in: ["PENDING"] } }
      : filter === "done"
        ? {
            status: {
              in: [
                "DISETUJUI_GURU",
                "DITOLAK_GURU",
                "DILIHAT_DUDI",
                "DITERIMA",
                "DITOLAK_DUDI",
                "DIBATALKAN_SISWA",
              ],
            },
          }
        : {};

  const pendaftaran = await prisma.pendaftaran.findMany({
    where: {
      siswa: { guruId: guru.id },
      ...statusWhere,
    },
    select: {
      id: true,
      status: true,
      skorSAW: true,
      motivasi: true,
      createdAt: true,
      updatedAt: true,
      siswa: {
        select: {
          id: true,
          nama: true,
          nis: true,
          jurusan: { select: { nama: true } },
        },
      },
      lowongan: {
        select: {
          id: true,
          judul: true,
          dudi: { select: { namaPerusahaan: true } },
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  const pendingCount = pendaftaran.filter(
    (p) => p.status === "PENDING",
  ).length;

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pendaftaran Siswa Bimbingan</h1>
        <p className="text-sm text-muted-foreground">
          Review pendaftaran PKL dari siswa yang Anda bimbing. Persetujuan Anda
          dibutuhkan sebelum pendaftaran diteruskan ke DU/DI.
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
                f.value === "all"
                  ? "/guru/pendaftaran"
                  : `/guru/pendaftaran?filter=${f.value}`
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

      {pendaftaran.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada pendaftaran di filter ini.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendaftaran.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <CardTitle className="text-base">
                      {p.lowongan.judul}
                    </CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {p.siswa.nama} · {p.siswa.nis} ·{" "}
                        {p.siswa.jurusan.nama}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {p.lowongan.dudi.namaPerusahaan}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={STATUS_VARIANT[p.status]}>
                      {STATUS_LABEL[p.status]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {fmt.format(p.createdAt)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {p.motivasi && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Motivasi siswa
                    </div>
                    <p className="whitespace-pre-wrap">{p.motivasi}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    {p.skorSAW !== null && (
                      <>Skor SAW: {(p.skorSAW * 100).toFixed(2)}</>
                    )}
                  </div>
                  {p.status === "PENDING" ? (
                    <GuruDecisionDialog
                      pendaftaranId={p.id}
                      siswaNama={p.siswa.nama}
                      lowonganJudul={p.lowongan.judul}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Diperbarui {fmt.format(p.updatedAt)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
