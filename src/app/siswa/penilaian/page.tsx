import { Building2, GraduationCap, Star } from "lucide-react";

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
import { ASPEK_PENILAIAN } from "@/lib/validations/penilaian";

export const metadata = { title: "Nilai PKL Saya" };

export default async function SiswaPenilaianPage() {
  const session = await requireRole(["SISWA"]);

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true, statusPKL: true },
  });
  if (!siswa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil siswa belum tersedia</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const penilaianList = await prisma.penilaian.findMany({
    where: { siswaId: siswa.id },
    select: {
      id: true,
      nilaiKedisiplinan: true,
      nilaiKeterampilan: true,
      nilaiKerjasama: true,
      nilaiInisiatif: true,
      nilaiTanggungJawab: true,
      nilaiRataRata: true,
      catatan: true,
      updatedAt: true,
      guru: { select: { nama: true } },
      dudi: { select: { namaPerusahaan: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Nilai PKL Saya</h1>
        <p className="text-sm text-muted-foreground">
          Penilaian akhir dari guru pembimbing dan DU/DI tempat PKL Anda.
        </p>
      </div>

      {siswa.statusPKL !== "SELESAI" && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Penilaian akhir akan tersedia setelah Anda menandai PKL selesai.
          </CardContent>
        </Card>
      )}

      {penilaianList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada penilaian yang masuk.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {penilaianList.map((p) => {
            const isGuru = Boolean(p.guru);
            return (
              <Card key={p.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        {isGuru ? "Guru Pembimbing" : "DU/DI"}
                      </CardTitle>
                      <CardDescription className="inline-flex items-center gap-1">
                        {isGuru ? (
                          <>
                            <GraduationCap className="h-3.5 w-3.5" />
                            {p.guru?.nama}
                          </>
                        ) : (
                          <>
                            <Building2 className="h-3.5 w-3.5" />
                            {p.dudi?.namaPerusahaan}
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {p.nilaiRataRata.toFixed(2)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 text-sm sm:grid-cols-5">
                    {ASPEK_PENILAIAN.map((a) => (
                      <div
                        key={a.key}
                        className="rounded-md border bg-muted/40 px-2 py-1.5"
                      >
                        <div className="text-xs text-muted-foreground">
                          {a.label}
                        </div>
                        <div className="font-mono font-semibold">
                          {p[a.key]}
                        </div>
                      </div>
                    ))}
                  </div>
                  {p.catatan && (
                    <div className="rounded-md border px-3 py-2 text-sm">
                      <div className="text-xs font-medium text-muted-foreground">
                        Catatan
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap">{p.catatan}</p>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Diperbarui {fmt.format(p.updatedAt)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
