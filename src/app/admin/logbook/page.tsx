import Link from "next/link";
import type { LogbookStatus } from "@prisma/client";

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
import {
  LOGBOOK_STATUS_LABEL,
  LOGBOOK_STATUS_VARIANT,
} from "@/lib/logbook";

export const metadata = { title: "Monitoring Logbook" };

const STATUS_VALUES: LogbookStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "REVIEWED",
  "REVISED",
];

function parseStatus(v: string | undefined): LogbookStatus | null {
  if (!v) return null;
  return (STATUS_VALUES as string[]).includes(v)
    ? (v as LogbookStatus)
    : null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminLogbookPage({ searchParams }: PageProps) {
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
              kegiatan: { contains: p.q, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };

  const [total, rows, grouped] = await Promise.all([
    prisma.logbook.count({ where }),
    prisma.logbook.findMany({
      where,
      select: {
        id: true,
        tanggal: true,
        kegiatan: true,
        status: true,
        updatedAt: true,
        siswa: {
          select: {
            nama: true,
            nis: true,
            jurusan: { select: { nama: true } },
          },
        },
      },
      orderBy: { tanggal: "desc" },
      ...paginateArgs(p),
    }),
    prisma.logbook.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const meta = paginationMeta(p, total);
  const byStatus = new Map<LogbookStatus, number>();
  for (const g of grouped) byStatus.set(g.status, g._count._all);

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Monitoring Logbook</h1>
        <p className="text-sm text-muted-foreground">
          Pantau semua entry logbook dari seluruh siswa PKL. Read-only.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STATUS_VALUES.map((s) => (
          <Card key={s} className="py-3">
            <CardContent className="px-3">
              <Badge variant={LOGBOOK_STATUS_VARIANT[s]}>
                {LOGBOOK_STATUS_LABEL[s]}
              </Badge>
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
          <Link href="/admin/logbook">Semua</Link>
        </Button>
        {STATUS_VALUES.map((s) => (
          <Button
            key={s}
            asChild
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
          >
            <Link href={`/admin/logbook?status=${s}`}>
              {LOGBOOK_STATUS_LABEL[s]}
            </Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Semua logbook
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan nama/NIS siswa atau isi kegiatan.
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
                  <TableHead className="w-[130px]">Tanggal</TableHead>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Kegiatan</TableHead>
                  <TableHead className="w-[140px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada logbook.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {fmt.format(r.tanggal)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{r.siswa.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.siswa.nis} · {r.siswa.jurusan.nama}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="line-clamp-2 text-sm">{r.kegiatan}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={LOGBOOK_STATUS_VARIANT[r.status]}>
                          {LOGBOOK_STATUS_LABEL[r.status]}
                        </Badge>
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
