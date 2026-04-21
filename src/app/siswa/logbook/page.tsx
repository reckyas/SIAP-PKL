import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { StatusPKLButton } from "./status-pkl-buttons";

export const metadata = { title: "Logbook PKL" };

export default async function SiswaLogbookPage() {
  const session = await requireRole(["SISWA"]);

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true, statusPKL: true },
  });
  if (!siswa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil belum tersedia</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const pendaftaranDiterima = await prisma.pendaftaran.findFirst({
    where: { siswaId: siswa.id, status: "DITERIMA" },
    select: {
      lowongan: {
        select: {
          judul: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          dudi: { select: { namaPerusahaan: true } },
        },
      },
    },
  });

  const logbook = await prisma.logbook.findMany({
    where: { siswaId: siswa.id },
    select: {
      id: true,
      tanggal: true,
      kegiatan: true,
      status: true,
      updatedAt: true,
    },
    orderBy: { tanggal: "desc" },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const fmtShort = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const canStart =
    siswa.statusPKL === "DITERIMA" &&
    pendaftaranDiterima !== null &&
    new Date() >= pendaftaranDiterima.lowongan.tanggalMulai;
  const canFinish =
    siswa.statusPKL === "SEDANG_PKL" &&
    pendaftaranDiterima !== null &&
    new Date() >= pendaftaranDiterima.lowongan.tanggalSelesai;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Logbook PKL</h1>
          <p className="text-sm text-muted-foreground">
            Catat kegiatan harian Anda selama PKL; guru akan mereview secara
            berkala.
          </p>
        </div>
        {siswa.statusPKL === "SEDANG_PKL" && (
          <Button asChild>
            <Link href="/siswa/logbook/baru">
              <Plus className="h-4 w-4" />
              Entry baru
            </Link>
          </Button>
        )}
      </div>

      {pendaftaranDiterima && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {pendaftaranDiterima.lowongan.dudi.namaPerusahaan}
            </CardTitle>
            <CardDescription>
              {pendaftaranDiterima.lowongan.judul} ·{" "}
              {fmtShort.format(pendaftaranDiterima.lowongan.tanggalMulai)}{" "}
              &ndash;{" "}
              {fmtShort.format(pendaftaranDiterima.lowongan.tanggalSelesai)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm">
              Status PKL:{" "}
              <Badge
                variant={
                  siswa.statusPKL === "SEDANG_PKL"
                    ? "default"
                    : siswa.statusPKL === "SELESAI"
                      ? "secondary"
                      : "outline"
                }
              >
                {siswa.statusPKL}
              </Badge>
            </div>
            <div className="flex gap-2">
              {canStart && (
                <StatusPKLButton
                  mode="mulai"
                  dateHint={fmtShort.format(
                    pendaftaranDiterima.lowongan.tanggalMulai,
                  )}
                />
              )}
              {canFinish && (
                <StatusPKLButton
                  mode="selesai"
                  dateHint={fmtShort.format(
                    pendaftaranDiterima.lowongan.tanggalSelesai,
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!pendaftaranDiterima && (
        <Alert>
          <AlertTitle>Belum diterima PKL</AlertTitle>
          <AlertDescription>
            Logbook baru tersedia setelah Anda diterima di salah satu lowongan.
            Cek <Link href="/siswa/pendaftaran" className="underline">
              Pendaftaran Saya
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      {siswa.statusPKL === "DITERIMA" && pendaftaranDiterima && !canStart && (
        <Alert>
          <AlertTitle>Belum waktunya mulai</AlertTitle>
          <AlertDescription>
            PKL baru bisa dimulai pada{" "}
            {fmtShort.format(pendaftaranDiterima.lowongan.tanggalMulai)}.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Riwayat entry
            <Badge variant="secondary">{logbook.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logbook.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada entry logbook.
            </p>
          ) : (
            logbook.map((l) => (
              <Link
                key={l.id}
                href={`/siswa/logbook/${l.id}`}
                className="block rounded-lg border p-3 transition hover:bg-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {fmt.format(l.tanggal)}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {l.kegiatan}
                    </p>
                  </div>
                  <Badge variant={LOGBOOK_STATUS_VARIANT[l.status]}>
                    {LOGBOOK_STATUS_LABEL[l.status]}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
