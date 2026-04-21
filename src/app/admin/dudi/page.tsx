import Link from "next/link";
import type { AccountStatus } from "@prisma/client";
import { Briefcase, ExternalLink, Plus, Star } from "lucide-react";

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

export const metadata = { title: "Kelola DU/DI" };

const STATUS_VALUES: AccountStatus[] = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
];

const STATUS_LABEL: Record<AccountStatus, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Ditolak",
  SUSPENDED: "Suspended",
};

const STATUS_VARIANT: Record<
  AccountStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  VERIFIED: "default",
  REJECTED: "destructive",
  SUSPENDED: "outline",
};

function parseStatus(v: string | undefined): AccountStatus | null {
  if (!v) return null;
  return (STATUS_VALUES as string[]).includes(v)
    ? (v as AccountStatus)
    : null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminDudiPage({ searchParams }: PageProps) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });
  const statusRaw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const statusFilter = parseStatus(statusRaw);

  const where = {
    user: {
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    ...(p.q
      ? {
          OR: [
            {
              namaPerusahaan: {
                contains: p.q,
                mode: "insensitive" as const,
              },
            },
            {
              namaPIC: { contains: p.q, mode: "insensitive" as const },
            },
            {
              user: {
                email: { contains: p.q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows, groupedStatus] = await Promise.all([
    prisma.dUDI.count({ where }),
    prisma.dUDI.findMany({
      where,
      select: {
        id: true,
        namaPerusahaan: true,
        bidangUsaha: true,
        alamat: true,
        namaPIC: true,
        noHpPIC: true,
        websiteUrl: true,
        ratingRataRata: true,
        jumlahReview: true,
        createdAt: true,
        user: { select: { email: true, status: true } },
        _count: { select: { lowongan: true } },
      },
      orderBy: { createdAt: "desc" },
      ...paginateArgs(p),
    }),
    prisma.user.groupBy({
      by: ["status"],
      where: { role: "DUDI", deletedAt: null },
      _count: { _all: true },
    }),
  ]);

  const meta = paginationMeta(p, total);
  const byStatus = new Map(
    groupedStatus.map((g) => [g.status, g._count._all]),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kelola DU/DI</h1>
          <p className="text-sm text-muted-foreground">
            Semua akun perusahaan mitra PKL. Verifikasi akun pending lewat{" "}
            <Link
              href="/admin/dudi-pending"
              className="underline underline-offset-2"
            >
              /admin/dudi-pending
            </Link>
            .
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/dudi/baru">
            <Plus className="h-4 w-4" />
            Tambah DU/DI
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <Link href="/admin/dudi">Semua</Link>
        </Button>
        {STATUS_VALUES.map((s) => (
          <Button
            key={s}
            asChild
            size="sm"
            variant={statusFilter === s ? "default" : "outline"}
          >
            <Link href={`/admin/dudi?status=${s}`}>{STATUS_LABEL[s]}</Link>
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar DU/DI
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan nama perusahaan, PIC, atau email.
            </CardDescription>
          </div>
          <div className="w-full max-w-md">
            <SearchInput placeholder="Cari nama perusahaan / PIC / email…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Bidang Usaha</TableHead>
                  <TableHead>PIC</TableHead>
                  <TableHead className="w-[100px]">Lowongan</TableHead>
                  <TableHead className="w-[120px]">Rating</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada DU/DI.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-medium">{d.namaPerusahaan}</div>
                        <div className="text-xs text-muted-foreground">
                          {d.user.email}
                        </div>
                        {d.websiteUrl && (
                          <a
                            href={d.websiteUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.bidangUsaha.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {d.bidangUsaha.map((b) => (
                              <Badge
                                key={b}
                                variant="outline"
                                className="text-[11px]"
                              >
                                {b}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{d.namaPIC}</div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {d.noHpPIC}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="inline-flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {d._count.lowongan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.jumlahReview > 0 ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="font-medium">
                              {d.ratingRataRata?.toFixed(2) ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({d.jumlahReview})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Belum ada
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.user.status]}>
                          {STATUS_LABEL[d.user.status]}
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
