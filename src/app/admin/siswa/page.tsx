import Link from "next/link";
import { Plus, Pencil, Upload } from "lucide-react";

import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { SiswaRowActions } from "./row-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Kelola Siswa" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SiswaListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp);

  const where = {
    deletedAt: null,
    ...(p.q
      ? {
          OR: [
            { nama: { contains: p.q, mode: "insensitive" as const } },
            { nis: { contains: p.q } },
            {
              user: {
                email: { contains: p.q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.siswa.count({ where }),
    prisma.siswa.findMany({
      where,
      select: {
        id: true,
        nis: true,
        nama: true,
        jenisKelamin: true,
        kelas: { select: { nama: true, tingkat: true } },
        statusPKL: true,
        jurusan: { select: { kode: true, nama: true } },
        user: { select: { email: true, status: true } },
      },
      orderBy: [{ nama: "asc" }],
      ...paginateArgs(p),
    }),
  ]);

  const meta = paginationMeta(p, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kelola Siswa</h1>
          <p className="text-sm text-muted-foreground">
            Tambah, ubah, dan hapus data siswa. Akun siswa dibuat oleh admin —
            tidak ada pendaftaran mandiri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/siswa/import">
              <Upload className="h-4 w-4" />
              Import
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/siswa/baru">
              <Plus className="h-4 w-4" />
              Tambah Siswa
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar siswa
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan nama, NIS, atau email.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari nama / NIS / email…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Jurusan</TableHead>
                  <TableHead>Status PKL</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada siswa.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">
                        {s.nis}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{s.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.jenisKelamin === "LAKI_LAKI"
                            ? "Laki-laki"
                            : "Perempuan"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.kelas
                          ? `${s.kelas.tingkat} — ${s.kelas.nama}`
                          : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{s.jurusan.kode}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {s.jurusan.nama}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={pklBadge(s.statusPKL)}>
                          {labelStatusPKL(s.statusPKL)}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                        {s.user.email}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              href={`/admin/siswa/${s.id}/edit`}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <SiswaRowActions
                            siswaId={s.id}
                            nama={s.nama}
                          />
                        </div>
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

function pklBadge(
  s: string,
): "default" | "secondary" | "outline" | "success" | "warning" | "destructive" {
  switch (s) {
    case "SELESAI":
      return "success";
    case "SEDANG_PKL":
    case "DITERIMA":
      return "default";
    case "MENUNGGU_KONFIRMASI":
      return "warning";
    case "DIBATALKAN":
      return "destructive";
    default:
      return "outline";
  }
}

function labelStatusPKL(s: string): string {
  const map: Record<string, string> = {
    BELUM_DAFTAR: "Belum daftar",
    MENUNGGU_KONFIRMASI: "Menunggu",
    DITERIMA: "Diterima",
    SEDANG_PKL: "Sedang PKL",
    SELESAI: "Selesai",
    DIBATALKAN: "Dibatalkan",
  };
  return map[s] ?? s;
}
