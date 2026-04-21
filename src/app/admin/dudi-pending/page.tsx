import { prisma } from "@/lib/db";
import {
  parsePagination,
  paginateArgs,
  paginationMeta,
} from "@/lib/pagination";
import { DataPagination } from "@/components/data-pagination";
import { SearchInput } from "@/components/search-input";
import { DudiPendingRow } from "./row";
import { Badge } from "@/components/ui/badge";
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

export const metadata = { title: "Verifikasi DU/DI" };

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DudiPendingPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const p = parsePagination(sp);

  const whereUser = {
    role: "DUDI" as const,
    status: "PENDING" as const,
    deletedAt: null,
    ...(p.q
      ? {
          OR: [
            { email: { contains: p.q, mode: "insensitive" as const } },
            {
              dudi: {
                is: {
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

  const [total, rows] = await Promise.all([
    prisma.user.count({ where: whereUser }),
    prisma.user.findMany({
      where: whereUser,
      select: {
        id: true,
        email: true,
        createdAt: true,
        dudi: {
          select: {
            namaPerusahaan: true,
            alamat: true,
            namaPIC: true,
            noHpPIC: true,
            bidangUsaha: true,
            websiteUrl: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      ...paginateArgs(p),
    }),
  ]);

  const meta = paginationMeta(p, total);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Verifikasi DU/DI</h1>
        <p className="text-sm text-muted-foreground">
          Setujui atau tolak akun perusahaan yang baru mendaftar.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Daftar pending
              <Badge variant="secondary">{total}</Badge>
            </CardTitle>
            <CardDescription>
              Akun DU/DI yang masih menunggu verifikasi admin.
            </CardDescription>
          </div>
          <div className="w-full max-w-sm">
            <SearchInput placeholder="Cari nama perusahaan atau email…" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Bidang Usaha</TableHead>
                  <TableHead>Daftar</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Tidak ada akun DU/DI pending.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((u) => (
                    <DudiPendingRow
                      key={u.id}
                      userId={u.id}
                      email={u.email}
                      createdAt={u.createdAt}
                      dudi={u.dudi}
                    />
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
