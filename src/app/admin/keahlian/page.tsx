import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { KeahlianToolbar } from "./keahlian-toolbar";
import { KeahlianRowActions } from "./keahlian-row-actions";
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

export const metadata = { title: "Kelola Keahlian" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function KeahlianPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp, { defaultSize: 20 });

  const where = p.q
    ? {
        OR: [
          { nama: { contains: p.q, mode: "insensitive" as const } },
          { kategori: { contains: p.q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [total, rows] = await Promise.all([
    prisma.keahlian.count({ where }),
    prisma.keahlian.findMany({
      where,
      select: {
        id: true,
        nama: true,
        kategori: true,
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
          <h1 className="text-2xl font-bold">Kelola Keahlian</h1>
          <p className="text-sm text-muted-foreground">
            Master data keahlian/kompetensi yang dimiliki siswa atau
            dipersyaratkan DU/DI.
          </p>
        </div>
        <KeahlianToolbar />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar keahlian
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>Cari berdasarkan nama atau kategori.</CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari nama / kategori…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Kategori</TableHead>
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
                      Belum ada keahlian.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((k) => {
                    const usage = k._count.siswa + k._count.lowongan;
                    return (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.nama}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {k.kategori ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" title="siswa + lowongan">
                            {k._count.siswa} / {k._count.lowongan}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <KeahlianRowActions
                            data={{
                              id: k.id,
                              nama: k.nama,
                              kategori: k.kategori ?? "",
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
