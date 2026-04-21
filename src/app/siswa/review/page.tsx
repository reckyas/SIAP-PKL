import Link from "next/link";
import { Building2, Edit, Plus, Star } from "lucide-react";

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

export const metadata = { title: "Review DU/DI" };

export default async function SiswaReviewListPage() {
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

  // DUDI yg pernah menerima siswa ini.
  const pendaftaranDiterima = await prisma.pendaftaran.findMany({
    where: {
      siswaId: siswa.id,
      status: "DITERIMA",
    },
    select: {
      lowongan: {
        select: {
          judul: true,
          dudi: {
            select: {
              id: true,
              namaPerusahaan: true,
              bidangUsaha: true,
            },
          },
        },
      },
    },
  });

  const dudiSet = new Map<
    string,
    { id: string; namaPerusahaan: string; bidangUsaha: string[]; judul: string }
  >();
  for (const p of pendaftaranDiterima) {
    const d = p.lowongan.dudi;
    if (!dudiSet.has(d.id)) {
      dudiSet.set(d.id, {
        id: d.id,
        namaPerusahaan: d.namaPerusahaan,
        bidangUsaha: d.bidangUsaha,
        judul: p.lowongan.judul,
      });
    }
  }
  const dudiList = [...dudiSet.values()];

  const reviews = await prisma.reviewDUDI.findMany({
    where: {
      siswaId: siswa.id,
      dudiId: { in: dudiList.map((d) => d.id) },
    },
    select: { dudiId: true, rating: true, updatedAt: true },
  });
  const reviewMap = new Map(reviews.map((r) => [r.dudiId, r]));

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Review DU/DI</h1>
        <p className="text-sm text-muted-foreground">
          Beri ulasan dan rating untuk perusahaan tempat Anda PKL. Membantu
          adik kelas memilih tempat PKL yang baik.
        </p>
      </div>

      {siswa.statusPKL !== "SELESAI" && (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Review hanya bisa dikirim setelah Anda menandai PKL selesai.
          </CardContent>
        </Card>
      )}

      {dudiList.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Anda belum pernah PKL di perusahaan manapun.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dudiList.map((d) => {
            const r = reviewMap.get(d.id);
            const canWrite = siswa.statusPKL === "SELESAI";
            return (
              <Card key={d.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <CardTitle className="text-base inline-flex items-center gap-1.5">
                        <Building2 className="h-4 w-4" />
                        {d.namaPerusahaan}
                      </CardTitle>
                      <CardDescription>
                        {d.bidangUsaha.join(", ")} · {d.judul}
                      </CardDescription>
                    </div>
                    {r ? (
                      <Badge variant="default" className="inline-flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {r.rating}/5
                      </Badge>
                    ) : (
                      <Badge variant="outline">Belum direview</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {r
                      ? `Diperbarui ${fmt.format(r.updatedAt)}`
                      : "Belum ada review dari Anda."}
                  </div>
                  <Button asChild size="sm" disabled={!canWrite}>
                    <Link href={canWrite ? `/siswa/review/${d.id}` : "#"}>
                      {r ? (
                        <>
                          <Edit className="h-4 w-4" />
                          Edit review
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Tulis review
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
