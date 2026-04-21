import Link from "next/link";
import { Plus, Pencil } from "lucide-react";

import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { GuruRowActions } from "./row-actions";
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

export const metadata = { title: "Kelola Guru" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function GuruListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp);

  const where = {
    user: { deletedAt: null },
    ...(p.q
      ? {
          OR: [
            { nama: { contains: p.q, mode: "insensitive" as const } },
            { nip: { contains: p.q } },
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
    prisma.guru.count({ where }),
    prisma.guru.findMany({
      where,
      select: {
        id: true,
        nama: true,
        nip: true,
        noHp: true,
        mataPelajaran: true,
        user: { select: { email: true } },
        _count: { select: { siswaBimbingan: true } },
      },
      orderBy: { nama: "asc" },
      ...paginateArgs(p),
    }),
  ]);

  const meta = paginationMeta(p, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kelola Guru Pembimbing</h1>
          <p className="text-sm text-muted-foreground">
            Tambah, ubah, dan hapus data guru pembimbing. Akun dibuat langsung
            oleh admin — tidak ada pendaftaran mandiri.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/guru/baru">
            <Plus className="h-4 w-4" />
            Tambah Guru
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar guru
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan nama, NIP, atau email.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari nama / NIP / email…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Mapel</TableHead>
                  <TableHead>Bimbingan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada guru.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell>
                        <div className="font-medium">{g.nama}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.user.email}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {g.nip ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {g.noHp}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.mataPelajaran ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {g._count.siswaBimbingan} siswa
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              href={`/admin/guru/${g.id}/edit`}
                              aria-label="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <GuruRowActions
                            guruId={g.id}
                            nama={g.nama}
                            jumlahBimbingan={g._count.siswaBimbingan}
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
