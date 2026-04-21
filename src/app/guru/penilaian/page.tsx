import Link from "next/link";
import { Building2, Edit, GraduationCap, Plus } from "lucide-react";

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

export default async function GuruPenilaianPage() {
  const session = await requireRole(["GURU_PEMBIMBING"]);

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

  // Siswa bimbingan yg statusPKL = SELESAI → bisa dinilai.
  const siswaList = await prisma.siswa.findMany({
    where: {
      guruId: guru.id,
      statusPKL: "SELESAI",
    },
    select: {
      id: true,
      nama: true,
      nis: true,
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
      penilaianDiterima: {
        where: { guruId: guru.id },
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
          Beri nilai akhir untuk siswa bimbingan yang sudah menyelesaikan PKL.
        </p>
      </div>

      {siswaList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada siswa bimbingan yang selesai PKL.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {siswaList.map((s) => {
            const p = s.penilaianDiterima[0];
            const tempat = s.pendaftaran[0]?.lowongan;
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
                        {tempat && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" />
                            {tempat.dudi.namaPerusahaan} — {tempat.judul}
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
                    <Link href={`/guru/penilaian/${s.id}`}>
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
