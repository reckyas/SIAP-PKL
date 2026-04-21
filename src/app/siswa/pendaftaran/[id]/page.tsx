import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft, MapPin } from "lucide-react";

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
import { STATUS_LABEL, STATUS_VARIANT } from "../status";
import { BatalkanPendaftaranButton } from "./batalkan-button";
import { TimelineList } from "./timeline-list";

export const metadata = { title: "Detail Pendaftaran" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiswaPendaftaranDetail({ params }: PageProps) {
  const session = await requireRole(["SISWA"]);
  const { id } = await params;

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!siswa) notFound();

  const p = await prisma.pendaftaran.findUnique({
    where: { id },
    select: {
      id: true,
      siswaId: true,
      status: true,
      skorSAW: true,
      motivasi: true,
      catatanGuru: true,
      catatanDUDI: true,
      createdAt: true,
      guruApprovedAt: true,
      dudiReviewedAt: true,
      lowongan: {
        select: {
          id: true,
          judul: true,
          dudi: {
            select: { namaPerusahaan: true, alamat: true },
          },
        },
      },
      timeline: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          catatan: true,
          aktorRole: true,
          createdAt: true,
        },
      },
    },
  });

  if (!p || p.siswaId !== siswa.id) notFound();

  const canCancel =
    p.status === "PENDING" ||
    p.status === "DISETUJUI_GURU" ||
    p.status === "DILIHAT_DUDI";

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/pendaftaran">
            <ChevronLeft className="h-4 w-4" />
            Semua pendaftaran
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{p.lowongan.judul}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {p.lowongan.dudi.namaPerusahaan}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {p.lowongan.dudi.alamat}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Riwayat perubahan status pendaftaran Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineList entries={p.timeline} />
            </CardContent>
          </Card>

          {p.motivasi && (
            <Card>
              <CardHeader>
                <CardTitle>Motivasi yang Anda tulis</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {p.motivasi}
              </CardContent>
            </Card>
          )}

          {p.catatanGuru && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan dari Guru</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {p.catatanGuru}
              </CardContent>
            </Card>
          )}

          {p.catatanDUDI && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan dari DU/DI</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {p.catatanDUDI}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Status
                </span>
                <Badge variant={STATUS_VARIANT[p.status]}>
                  {STATUS_LABEL[p.status]}
                </Badge>
              </div>
              {p.skorSAW !== null && (
                <div className="flex justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Skor SAW
                  </span>
                  <span className="font-mono">
                    {(p.skorSAW * 100).toFixed(2)}
                  </span>
                </div>
              )}
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href={`/siswa/lowongan/${p.lowongan.id}`}>
                  Lihat lowongan
                </Link>
              </Button>
              {canCancel && <BatalkanPendaftaranButton id={p.id} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
