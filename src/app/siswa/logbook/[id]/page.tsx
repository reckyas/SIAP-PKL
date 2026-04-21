import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";

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
import { LogbookForm } from "../logbook-form";
import { LogbookActions } from "./logbook-actions";

export const metadata = { title: "Detail Logbook" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SiswaLogbookDetail({ params }: PageProps) {
  const session = await requireRole(["SISWA"]);
  const { id } = await params;

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!siswa) notFound();

  const logbook = await prisma.logbook.findUnique({
    where: { id },
    select: {
      id: true,
      siswaId: true,
      tanggal: true,
      kegiatan: true,
      kendala: true,
      lampiranUrls: true,
      status: true,
      reviewedAt: true,
      catatanReview: true,
    },
  });
  if (!logbook || logbook.siswaId !== siswa.id) notFound();

  const editable =
    logbook.status === "DRAFT" || logbook.status === "REVISED";

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
          <Link href="/siswa/logbook">
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
      </div>

      {logbook.status === "REVISED" && logbook.catatanReview && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base">Perlu revisi</CardTitle>
            <CardDescription>
              Guru memberikan catatan di bawah ini. Perbaiki, lalu kirim ulang.
            </CardDescription>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">
            {logbook.catatanReview}
          </CardContent>
        </Card>
      )}

      {logbook.status === "REVIEWED" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sudah direview</CardTitle>
            <CardDescription>
              {logbook.reviewedAt
                ? `Direview pada ${fmtTime.format(logbook.reviewedAt)}.`
                : "Direview guru."}
            </CardDescription>
          </CardHeader>
          {logbook.catatanReview && (
            <CardContent className="whitespace-pre-wrap text-sm">
              {logbook.catatanReview}
            </CardContent>
          )}
        </Card>
      )}

      {editable ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit entry</CardTitle>
            <CardDescription>
              Ubah isi kapan saja sebelum dikirim. Setelah dikirim, hanya guru
              yg bisa mengembalikan ke status revisi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LogbookForm
              mode="edit"
              defaults={{
                id: logbook.id,
                tanggal: logbook.tanggal,
                kegiatan: logbook.kegiatan,
                kendala: logbook.kendala ?? "",
                lampiranUrlsText: logbook.lampiranUrls.join("\n"),
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <>
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
        </>
      )}

      <LogbookActions
        id={logbook.id}
        status={logbook.status}
        canSubmit={editable}
        canDelete={logbook.status === "DRAFT"}
      />
    </div>
  );
}
