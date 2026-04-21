import { MessageSquare, Star, UserCircle2 } from "lucide-react";

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

export const metadata = { title: "Review dari Siswa" };

export default async function DudiReviewPage() {
  const session = await requireRole(["DUDI"]);

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      namaPerusahaan: true,
      ratingRataRata: true,
      jumlahReview: true,
    },
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

  const reviews = await prisma.reviewDUDI.findMany({
    where: { dudiId: dudi.id },
    select: {
      id: true,
      rating: true,
      komentar: true,
      anonim: true,
      createdAt: true,
      siswa: {
        select: {
          nama: true,
          jurusan: { select: { nama: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Distribusi rating 1..5 untuk ringkasan.
  const distribusi: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of reviews) {
    if (r.rating >= 1 && r.rating <= 5) {
      distribusi[r.rating as 1 | 2 | 3 | 4 | 5]++;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Review dari Siswa</h1>
        <p className="text-sm text-muted-foreground">
          Ulasan dari siswa yang pernah PKL di {dudi.namaPerusahaan}.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rating rata-rata</CardDescription>
            <CardTitle className="inline-flex items-center gap-1.5">
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
              {dudi.ratingRataRata?.toFixed(2) ?? "-"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total review</CardDescription>
            <CardTitle>{dudi.jumlahReview}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Distribusi</CardDescription>
            <div className="mt-1 space-y-0.5 text-xs">
              {([5, 4, 3, 2, 1] as const).map((n) => {
                const count = distribusi[n];
                const pct = reviews.length
                  ? Math.round((count / reviews.length) * 100)
                  : 0;
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="w-6 font-medium">{n}★</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-muted-foreground">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardHeader>
        </Card>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada review yang masuk.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base inline-flex items-center gap-1.5">
                      <UserCircle2 className="h-4 w-4" />
                      {r.anonim ? "Anonim" : r.siswa.nama}
                    </CardTitle>
                    {!r.anonim && (
                      <CardDescription>
                        {r.siswa.jurusan.nama}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
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
                  <div className="flex gap-2 text-sm">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="whitespace-pre-wrap">{r.komentar}</p>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
