import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ExternalLink,
  GraduationCap,
} from "lucide-react";

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
import { ReviewLogbookDialog } from "./review-logbook-dialog";

export const metadata = { title: "Review Logbook" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuruLogbookDetail({ params }: PageProps) {
  const session = await requireRole(["GURU_PEMBIMBING"]);
  const { id } = await params;

  const guru = await prisma.guru.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!guru) notFound();

  const logbook = await prisma.logbook.findUnique({
    where: { id },
    select: {
      id: true,
      tanggal: true,
      kegiatan: true,
      kendala: true,
      lampiranUrls: true,
      status: true,
      reviewedAt: true,
      catatanReview: true,
      siswa: {
        select: {
          id: true,
          nama: true,
          nis: true,
          guruId: true,
          jurusan: { select: { nama: true } },
          pendaftaran: {
            where: { status: "DITERIMA" },
            select: {
              lowongan: {
                select: {
                  judul: true,
                  dudi: { select: { namaPerusahaan: true } },
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });
  if (!logbook || logbook.siswa.guruId !== guru.id) notFound();

  const canReview = logbook.status === "SUBMITTED";
  const tempatPKL = logbook.siswa.pendaftaran[0]?.lowongan;

  const fmt = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fmtTime = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/guru/logbook">
            <ChevronLeft className="h-4 w-4" />
            Semua logbook
          </Link>
        </Button>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{fmt.format(logbook.tanggal)}</h1>
          <Badge variant={LOGBOOK_STATUS_VARIANT[logbook.status]}>
            {LOGBOOK_STATUS_LABEL[logbook.status]}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {logbook.siswa.nama} · {logbook.siswa.nis} ·{" "}
            {logbook.siswa.jurusan.nama}
          </span>
          {tempatPKL && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              {tempatPKL.dudi.namaPerusahaan} — {tempatPKL.judul}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Kegiatan</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {logbook.kegiatan}
            </CardContent>
          </Card>

          {logbook.kendala && (
            <Card>
              <CardHeader>
                <CardTitle>Kendala</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {logbook.kendala}
              </CardContent>
            </Card>
          )}

          {logbook.lampiranUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lampiran</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {logbook.lampiranUrls.map((url) => (
                    <li key={url}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {logbook.catatanReview && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan review</CardTitle>
                <CardDescription>
                  {logbook.reviewedAt
                    ? `Direview pada ${fmtTime.format(logbook.reviewedAt)}.`
                    : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {logbook.catatanReview}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Keputusan</CardTitle>
            </CardHeader>
            <CardContent>
              {canReview ? (
                <ReviewLogbookDialog
                  logbookId={logbook.id}
                  siswaNama={logbook.siswa.nama}
                  tanggalLabel={fmt.format(logbook.tanggal)}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  {logbook.status === "DRAFT"
                    ? "Siswa belum mengirim logbook ini."
                    : "Logbook ini sudah direview."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
