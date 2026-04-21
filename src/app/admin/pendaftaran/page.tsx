import Link from "next/link";
import type { StatusPendaftaran } from "@prisma/client";

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
import { STATUS_LABEL, STATUS_VARIANT } from "@/app/siswa/pendaftaran/status";

export const metadata = { title: "Monitoring Pendaftaran" };

const STATUS_VALUES: StatusPendaftaran[] = [
  "PENDING",
  "DISETUJUI_GURU",
  "DITOLAK_GURU",
  "DILIHAT_DUDI",
  "DITERIMA",
  "DITOLAK_DUDI",
  "DIBATALKAN_SISWA",
];

function parseStatus(v: string | undefined): StatusPendaftaran | null {
  if (!v) return null;
  return (STATUS_VALUES as string[]).includes(v)
    ? (v as StatusPendaftaran)
    : null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPendaftaranPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const statusFilter = parseStatus(statusRaw);

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(p.q
      ? {
          OR: [
            {
              siswa: {
                nama: { contains: p.q, mode: "insensitive" as const },
              },
            },
            {
              siswa: {
                nis: { contains: p.q, mode: "insensitive" as const },
              },
            },
            {
              lowongan: {
                judul: { contains: p.q, mode: "insensitive" as const },
              },
            },
            {
              lowongan: {
                dudi: {
                  namaPerusahaan: {
                    contains: p.q,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows, groupedStatus] = await Promise.all([
    prisma.pendaftaran.count({ where }),
    prisma.pendaftaran.findMany({
      where,
      select: {
        id: true,
        status: true,
        skorSAW: true,
        createdAt: true,
        updatedAt: true,
        siswa: {
          select: {
            nama: true,
            nis: true,
            jurusan: { select: { nama: true } },
          },
        },
        lowongan: {
          select: {
            id: true,
            judul: true,
            dudi: { select: { namaPerusahaan: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      ...paginateArgs(p),
    }),
    prisma.pendaftaran.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const meta = paginationMeta(p, total);
  const byStatus = new Map<StatusPendaftaran, number>();
  for (const g of groupedStatus) byStatus.set(g.status, g._count._all);

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Pendaftaran</h1>
        <p className="text-sm text-muted-foreground">
          Pantau semua pendaftaran PKL lintas siswa, guru, dan DU/DI. Halaman
          ini bersifat read-only — keputusan tetap di tangan guru dan DU/DI.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {STATUS_VALUES.map((s) => (
          <Card key={s} className="py-3">
            <CardContent className="px-3">
              <Badge variant={STATUS_VARIANT[s]}>{STATUS_LABEL[s]}</Badge>
              <div className="mt-1 text-2xl font-bold">
                {byStatus.get(s) ?? 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-1">
        <Button
          asChild
          size="sm"
          variant={statusFilter === null ? "default" : "outline"}
        >
          <Link href="/admin/pendaftaran">Semua</Link>
        </Button>
        {STATUS_VALUES.map((s) => (
          <Button
            key={s}
            asChild
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
          >
            <Link href={`/admin/pendaftaran?status=${s}`}>
              {STATUS_LABEL[s]}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Semua pendaftaran
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Filter berdasarkan status atau cari berdasarkan nama/NIS/lowongan/DU-DI.
            </CardDescription>
          </div>
          <div className="w-full max-w-md">
            <SearchInput placeholder="Cari…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Lowongan · DU/DI</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                  <TableHead className="w-[90px]">Skor</TableHead>
                  <TableHead className="w-[120px]">Diperbarui</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada pendaftaran.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.siswa.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.siswa.nis} · {r.siswa.jurusan.nama}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.lowongan.judul}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.lowongan.dudi.namaPerusahaan}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status]}>
                          {STATUS_LABEL[r.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.skorSAW !== null
                          ? (r.skorSAW * 100).toFixed(2)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmt.format(r.updatedAt)}
                      </TableCell>
                    </TableRow>
                  ))
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

