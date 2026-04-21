import Link from "next/link";
import { Briefcase, Edit, GraduationCap, Plus } from "lucide-react";

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

export const metadata = { title: "Penilaian PKL" };

export default async function DudiPenilaianPage() {
  const session = await requireRole(["DUDI"]);

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil DU/DI belum tersedia</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Siswa yg DITERIMA di lowongan DUDI ini & statusPKL = SELESAI.
  const siswaList = await prisma.siswa.findMany({
    where: {
      statusPKL: "SELESAI",
      pendaftaran: {
        some: {
          status: "DITERIMA",
          lowongan: { dudiId: dudi.id },
        },
      },
    },
    select: {
      id: true,
      nama: true,
      nis: true,
      jurusan: { select: { nama: true } },
      pendaftaran: {
        where: {
          status: "DITERIMA",
          lowongan: { dudiId: dudi.id },
        },
        select: {
          lowongan: { select: { judul: true } },
        },
        take: 1,
      },
      penilaianDiterima: {
        where: { dudiId: dudi.id },
        select: { id: true, nilaiRataRata: true, updatedAt: true },
        take: 1,
      },
    },
    orderBy: { nama: "asc" },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Penilaian Akhir PKL</h1>
        <p className="text-sm text-muted-foreground">
          Beri nilai akhir untuk siswa yang sudah menyelesaikan PKL di
          perusahaan Anda.
        </p>
      </div>

      {siswaList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada siswa yang selesai PKL di perusahaan Anda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {siswaList.map((s) => {
            const p = s.penilaianDiterima[0];
            const lowongan = s.pendaftaran[0]?.lowongan;
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base">{s.nama}</CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {s.nis} · {s.jurusan.nama}
                        </span>
                        {lowongan && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3.5 w-3.5" />
                            {lowongan.judul}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    {p ? (
                      <Badge variant="default">
                        Rata-rata {p.nilaiRataRata.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Belum dinilai</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {p
                      ? `Diperbarui ${fmt.format(p.updatedAt)}`
                      : "Belum ada penilaian dari Anda."}
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/dudi/penilaian/${s.id}`}>
                      {p ? (
                        <>
                          <Edit className="h-4 w-4" />
                          Edit nilai
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Beri nilai
                        </>
                      )}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
