import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Logbook Siswa PKL" };

export default async function DudiLogbookPage() {
  const session = await requireRole(["DUDI"]);

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil DU/DI belum lengkap</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Siswa yg DITERIMA di salah satu lowongan DUDI ini.
  const logbook = await prisma.logbook.findMany({
    where: {
      siswa: {
        pendaftaran: {
          some: {
            status: "DITERIMA",
            lowongan: { dudiId: dudi.id },
          },
        },
      },
    },
    select: {
      id: true,
      tanggal: true,
      kegiatan: true,
      status: true,
      siswa: {
        select: {
          nama: true,
          nis: true,
          jurusan: { select: { nama: true } },
        },
      },
    },
    orderBy: { tanggal: "desc" },
    take: 100,
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logbook Siswa PKL</h1>
        <p className="text-sm text-muted-foreground">
          Pantau catatan harian siswa yang PKL di perusahaan Anda. Keputusan
          review tetap di guru pembimbing.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Entry terbaru
            <Badge variant="secondary">{logbook.length}</Badge>
          </CardTitle>
          <CardDescription>
            100 entry logbook terbaru dari siswa yg diterima.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {logbook.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada logbook.
            </p>
          ) : (
            logbook.map((l) => (
              <Link
                key={l.id}
                href={`/dudi/logbook/${l.id}`}
                className="block rounded-lg border p-3 transition hover:bg-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {fmt.format(l.tanggal)}
                    </div>
                    <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />
                      {l.siswa.nama} · {l.siswa.nis} · {l.siswa.jurusan.nama}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
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
