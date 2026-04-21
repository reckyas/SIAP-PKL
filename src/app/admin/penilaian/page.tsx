import { Building2, GraduationCap, Star, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ASPEK_PENILAIAN } from "@/lib/validations/penilaian";

export const metadata = { title: "Monitoring Penilaian" };

export default async function AdminPenilaianPage() {
  await requireRole(["ADMIN"]);

  const [penilaianList, reviewList, penilaianAgg, reviewAgg] = await Promise.all([
    prisma.penilaian.findMany({
      select: {
        id: true,
        nilaiRataRata: true,
        nilaiKedisiplinan: true,
        nilaiKeterampilan: true,
        nilaiKerjasama: true,
        nilaiInisiatif: true,
        nilaiTanggungJawab: true,
        catatan: true,
        updatedAt: true,
        siswa: {
          select: {
            nama: true,
            nis: true,
            jurusan: { select: { nama: true } },
          },
        },
        guru: { select: { nama: true } },
        dudi: { select: { namaPerusahaan: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.reviewDUDI.findMany({
      select: {
        id: true,
        rating: true,
        komentar: true,
        anonim: true,
        createdAt: true,
        siswa: {
          select: {
            nama: true,
            nis: true,
            jurusan: { select: { nama: true } },
          },
        },
        dudi: { select: { namaPerusahaan: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.penilaian.aggregate({
      _avg: { nilaiRataRata: true },
      _count: { _all: true },
    }),
    prisma.reviewDUDI.aggregate({
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const byGuru = penilaianList.filter((p) => p.guru).length;
  const byDudi = penilaianList.filter((p) => p.dudi).length;

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Penilaian</h1>
        <p className="text-sm text-muted-foreground">
          Pantau penilaian akhir PKL dan review siswa terhadap DU/DI.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total penilaian</CardDescription>
            <CardTitle>{penilaianAgg._count._all}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {byGuru} guru · {byDudi} DU/DI
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rata-rata nilai PKL</CardDescription>
            <CardTitle>
              {penilaianAgg._avg.nilaiRataRata?.toFixed(2) ?? "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total review DU/DI</CardDescription>
            <CardTitle>{reviewAgg._count._all}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rata-rata rating DU/DI</CardDescription>
            <CardTitle className="inline-flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {reviewAgg._avg.rating?.toFixed(2) ?? "-"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="penilaian">
        <TabsList>
          <TabsTrigger value="penilaian">Penilaian</TabsTrigger>
          <TabsTrigger value="review">Review DU/DI</TabsTrigger>
        </TabsList>

        <TabsContent value="penilaian" className="space-y-3">
          {penilaianList.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada penilaian.
              </CardContent>
            </Card>
          ) : (
            penilaianList.map((p) => {
              const isGuru = Boolean(p.guru);
              return (
                <Card key={p.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle className="text-base">
                          {p.siswa.nama}
                        </CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                          <span>
                            {p.siswa.nis} · {p.siswa.jurusan.nama}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            {isGuru ? (
                              <>
                                <GraduationCap className="h-3.5 w-3.5" />
                                Guru: {p.guru?.nama}
                              </>
                            ) : (
                              <>
                                <Building2 className="h-3.5 w-3.5" />
                                DU/DI: {p.dudi?.namaPerusahaan}
                              </>
                            )}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="default">
                          Rata-rata {p.nilaiRataRata.toFixed(2)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fmt.format(p.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid gap-2 text-xs sm:grid-cols-5">
                      {ASPEK_PENILAIAN.map((a) => (
                        <div
                          key={a.key}
                          className="rounded-md border bg-muted/40 px-2 py-1"
                        >
                          <div className="text-muted-foreground">
                            {a.label}
                          </div>
                          <div className="font-mono font-semibold">
                            {p[a.key]}
                          </div>
                        </div>
                      ))}
                    </div>
                    {p.catatan && (
                      <div className="rounded-md border px-3 py-1.5 text-sm">
                        <div className="text-xs font-medium text-muted-foreground">
                          Catatan
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap">
                          {p.catatan}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="review" className="space-y-3">
          {reviewList.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada review.
              </CardContent>
            </Card>
          ) : (
            reviewList.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <CardTitle className="text-base inline-flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {r.dudi.namaPerusahaan}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                        <span className="inline-flex items-center gap-1">
                          <UserCircle2 className="h-3.5 w-3.5" />
                          {r.siswa.nama} ({r.siswa.nis})
                          {r.anonim && " · ditampilkan anonim"}
                        </span>
                        <span>{r.siswa.jurusan.nama}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="default" className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {r.rating}/5
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {fmt.format(r.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {r.komentar && (
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">{r.komentar}</p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
