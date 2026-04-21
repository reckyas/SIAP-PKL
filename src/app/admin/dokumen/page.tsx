import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { DokumenToolbar } from "./dokumen-toolbar";
import { DokumenRowActions } from "./dokumen-row-actions";
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

export const metadata = { title: "Kelola Dokumen" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DokumenPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });

  const where = p.q
    ? {
        OR: [
          { nama: { contains: p.q, mode: "insensitive" as const } },
          { deskripsi: { contains: p.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.dokumen.count({ where }),
    prisma.dokumen.findMany({
      where,
      select: {
        id: true,
        nama: true,
        deskripsi: true,
        _count: { select: { siswa: true, lowongan: true } },
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
          <h1 className="text-2xl font-bold">Kelola Dokumen</h1>
          <p className="text-sm text-muted-foreground">
            Master data dokumen syarat PKL (mis. CV, surat izin orang tua,
            pas foto, dst.).
          </p>
        </div>
        <DokumenToolbar />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar dokumen
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>Cari berdasarkan nama atau deskripsi.</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari nama dokumen…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Deskripsi</TableHead>
                  <TableHead className="w-[120px]">Dipakai</TableHead>
                  <TableHead className="w-[120px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada dokumen.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d) => {
                    const usage = d._count.siswa + d._count.lowongan;
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.nama}</TableCell>
                        <TableCell className="max-w-[400px] truncate text-sm text-muted-foreground">
                          {d.deskripsi ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" title="siswa + lowongan">
                            {d._count.siswa} / {d._count.lowongan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DokumenRowActions
                            data={{
                              id: d.id,
                              nama: d.nama,
                              deskripsi: d.deskripsi ?? "",
                            }}
                            usage={usage}
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
