import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { JurusanToolbar } from "./jurusan-toolbar";
import { JurusanRowActions } from "./jurusan-row-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Kelola Jurusan" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function JurusanPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });

  const where = p.q
    ? {
        OR: [
          { kode: { contains: p.q, mode: "insensitive" as const } },
          { nama: { contains: p.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.jurusan.count({ where }),
    prisma.jurusan.findMany({
      where,
      select: {
        id: true,
        kode: true,
        nama: true,
        deskripsi: true,
        _count: { select: { siswa: true } },
      },
      orderBy: { kode: "asc" },
      ...paginateArgs(p),
    }),
  ]);

  const meta = paginationMeta(p, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kelola Jurusan</h1>
          <p className="text-sm text-muted-foreground">
            Master data jurusan/kompetensi keahlian SMKN 1 Badegan.
          </p>
        </div>
        <JurusanToolbar />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar jurusan
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>Cari berdasarkan kode atau nama.</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari kode / nama…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Kode</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-[100px]">Siswa</TableHead>
                  <TableHead className="w-[120px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada jurusan.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="font-mono text-xs">
                        {j.kode}
                      </TableCell>
                      <TableCell className="font-medium">{j.nama}</TableCell>
                      <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">
                        {j.deskripsi ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{j._count.siswa}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <JurusanRowActions
                          data={{
                            id: j.id,
                            kode: j.kode,
                            nama: j.nama,
                            deskripsi: j.deskripsi ?? "",
                          }}
                          jumlahSiswa={j._count.siswa}
                        />
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
