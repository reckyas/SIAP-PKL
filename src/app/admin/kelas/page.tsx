import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { KelasToolbar } from "./kelas-toolbar";
import { KelasRowActions } from "./kelas-row-actions";
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

export const metadata = { title: "Kelola Kelas" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KelasListPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });

  const where = p.q
    ? {
        OR: [
          { nama: { contains: p.q, mode: "insensitive" as const } },
          {
            jurusan: {
              kode: { contains: p.q, mode: "insensitive" as const },
            },
          },
          {
            jurusan: {
              nama: { contains: p.q, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [total, rows, jurusan] = await Promise.all([
    prisma.kelas.count({ where }),
    prisma.kelas.findMany({
      where,
      select: {
        id: true,
        nama: true,
        tingkat: true,
        jurusanId: true,
        jurusan: { select: { kode: true, nama: true } },
        _count: { select: { siswa: true } },
      },
      orderBy: [
        { jurusan: { kode: "asc" } },
        { tingkat: "asc" },
        { nama: "asc" },
      ],
      ...paginateArgs(p),
    }),
    prisma.jurusan.findMany({
      select: { id: true, kode: true, nama: true },
      orderBy: { kode: "asc" },
    }),
  ]);

  const meta = paginationMeta(p, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Kelola Kelas</h1>
          <p className="text-sm text-muted-foreground">
            Master data kelas per jurusan & tingkat. Dipakai saat
            menambah/mengubah data siswa.
          </p>
        </div>
        <KelasToolbar jurusan={jurusan} />
      </div>

      {jurusan.length === 0 && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Belum ada jurusan. Tambahkan jurusan lebih dulu sebelum membuat
            kelas.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar kelas
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Cari berdasarkan nama kelas atau jurusan.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari kelas / jurusan…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Tingkat</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jurusan</TableHead>
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
                      Belum ada kelas.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono text-xs">
                        {k.tingkat}
                      </TableCell>
                      <TableCell className="font-medium">{k.nama}</TableCell>
                      <TableCell>
                        <div className="text-sm">{k.jurusan.kode}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {k.jurusan.nama}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{k._count.siswa}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <KelasRowActions
                          data={{
                            id: k.id,
                            nama: k.nama,
                            tingkat: k.tingkat,
                            jurusanId: k.jurusanId,
                          }}
                          jumlahSiswa={k._count.siswa}
                          jurusan={jurusan}
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
