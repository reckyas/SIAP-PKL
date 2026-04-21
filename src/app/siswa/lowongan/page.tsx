import Link from "next/link";
import { Sparkles, Building2, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Cari Lowongan" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SiswaLowonganPage({ searchParams }: PageProps) {
  const session = await requireRole(["SISWA"]);
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 10 });

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { jurusanId: true },
  });

  const where = {
    status: "OPEN" as const,
    ...(siswa
      ? { jurusanTarget: { some: { jurusanId: siswa.jurusanId } } }
      : {}),
    ...(p.q
      ? {
          OR: [
            { judul: { contains: p.q, mode: "insensitive" as const } },
            { deskripsi: { contains: p.q, mode: "insensitive" as const } },
            {
              bidang: {
                some: {
                  bidang: {
                    nama: { contains: p.q, mode: "insensitive" as const },
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.lowongan.count({ where }),
    prisma.lowongan.findMany({
      where,
      select: {
        id: true,
        judul: true,
        bidang: { select: { bidang: { select: { id: true, nama: true } } } },
        kuotaTotal: true,
        terisiLaki: true,
        terisiPerempuan: true,
        tanggalMulai: true,
        tanggalSelesai: true,
        uangSaku: true,
        makanSiang: true,
        transport: true,
        dudi: {
          select: {
            namaPerusahaan: true,
            alamat: true,
            ratingRataRata: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      ...paginateArgs(p),
    }),
  ]);

  const meta = paginationMeta(p, total);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Cari Lowongan</h1>
          <p className="text-sm text-muted-foreground">
            Jelajahi semua lowongan PKL yang sedang terbuka.
          </p>
        </div>
        <Button asChild>
          <Link href="/siswa/lowongan/rekomendasi">
            <Sparkles className="h-4 w-4" />
            Lihat rekomendasi untuk saya
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Lowongan terbuka
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan judul, deskripsi, atau bidang.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari lowongan…" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada lowongan terbuka.
            </p>
          ) : (
            rows.map((l) => {
              const terisi = l.terisiLaki + l.terisiPerempuan;
              const sisa = Math.max(0, l.kuotaTotal - terisi);
              return (
                <Link
                  key={l.id}
                  href={`/siswa/lowongan/${l.id}`}
                  className="block rounded-lg border p-4 transition hover:bg-accent"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{l.judul}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {l.dudi.namaPerusahaan}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {l.dudi.alamat.slice(0, 60)}
                          {l.dudi.alamat.length > 60 ? "…" : ""}
                        </span>
                        {l.dudi.ratingRataRata !== null && (
                          <span>⭐ {l.dudi.ratingRataRata.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant={sisa > 0 ? "default" : "destructive"}>
                      {sisa > 0 ? `${sisa} slot` : "Penuh"}
                    </Badge>
                  </div>
                  {l.bidang.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {l.bidang.map((b) => (
                        <Badge
                          key={b.bidang.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {b.bidang.nama}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>
                      Periode {fmt.format(l.tanggalMulai)} –{" "}
                      {fmt.format(l.tanggalSelesai)}
                    </span>
                    {l.uangSaku !== null && l.uangSaku > 0 && (
                      <span>Uang saku Rp{l.uangSaku.toLocaleString("id-ID")}</span>
                    )}
                    {l.makanSiang && <span>🍱 Makan</span>}
                    {l.transport && <span>🚌 Transport</span>}
                  </div>
                </Link>
              );
            })
          )}
          <DataPagination meta={meta} />
        </CardContent>
      </Card>
    </div>
  );
}
