import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { requireRole } from "@/lib/session";
import type { StatusLowongan } from "@prisma/client";
import { LowonganRowActions } from "./row-actions";
import { StatusFilter } from "./status-filter";

export const metadata = { title: "Lowongan PKL" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const STATUS_LABEL: Record<StatusLowongan, string> = {
  DRAFT: "Draft",
  OPEN: "Terbuka",
  CLOSED: "Ditutup",
  FULL: "Penuh",
};

const STATUS_VARIANT: Record<
  StatusLowongan,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  OPEN: "default",
  CLOSED: "secondary",
  FULL: "destructive",
};

function parseStatus(v: string | undefined): StatusLowongan | null {
  if (v === "DRAFT" || v === "OPEN" || v === "CLOSED" || v === "FULL") return v;
  return null;
}

export default async function DudiLowonganPage({ searchParams }: PageProps) {
  const session = await requireRole(["DUDI"]);
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 15 });
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const statusFilter = parseStatus(statusRaw);

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil DU/DI belum lengkap</CardTitle>
          <CardDescription>
            Lengkapi profil di menu <Link href="/dudi/profil" className="underline">Profil</Link>{" "}
            sebelum membuat lowongan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const where = {
    dudiId: dudi.id,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(p.q
      ? {
          OR: [
            { judul: { contains: p.q, mode: "insensitive" as const } },
            { deskripsi: { contains: p.q, mode: "insensitive" as const } },
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
        status: true,
        _count: { select: { pendaftaran: true } },
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
          <h1 className="text-2xl font-bold">Lowongan PKL</h1>
          <p className="text-sm text-muted-foreground">
            Kelola lowongan yang Anda publikasikan. Siswa akan melihat lowongan
            berstatus <em>Terbuka</em>.
          </p>
        </div>
        <Button asChild>
          <Link href="/dudi/lowongan/baru">
            <Plus className="h-4 w-4" />
            Lowongan baru
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar lowongan
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan judul / deskripsi; filter berdasarkan status.
            </CardDescription>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <StatusFilter current={statusFilter} />
            <SearchInput placeholder="Cari lowongan…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judul</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">Kuota</TableHead>
                  <TableHead className="w-[180px]">Periode</TableHead>
                  <TableHead className="w-[80px]">Daftar</TableHead>
                  <TableHead className="w-[60px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada lowongan.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((l) => {
                    const terisi = l.terisiLaki + l.terisiPerempuan;
                    return (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          <div>{l.judul}</div>
                          {l.bidang.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {l.bidang.slice(0, 3).map((b) => (
                                <Badge
                                  key={b.bidang.id}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {b.bidang.nama}
                                </Badge>
                              ))}
                              {l.bidang.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{l.bidang.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[l.status]}>
                            {STATUS_LABEL[l.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {terisi} / {l.kuotaTotal}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {fmt.format(l.tanggalMulai)}
                          <br />
                          s/d {fmt.format(l.tanggalSelesai)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dudi/lowongan/${l.id}/pendaftar`}
                            className="inline-flex"
                          >
                            <Badge
                              variant="outline"
                              className="cursor-pointer hover:bg-accent"
                            >
                              {l._count.pendaftaran}
                            </Badge>
                          </Link>
                        </TableCell>
                        <TableCell className="text-right">
                          <LowonganRowActions
                            id={l.id}
                            judul={l.judul}
                            status={l.status}
                            pendaftarCount={l._count.pendaftaran}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <DataPagination meta={meta} />
        </CardContent>
      </Card>
    </div>
  );
}

