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
import { prisma } from "@/lib/db";
import { SAWRowActions } from "./saw-row-actions";
import { SAWToolbar } from "./saw-toolbar";

export const metadata = { title: "Bobot SAW" };

export default async function SAWWeightPage() {
  const [rows, jurusan] = await Promise.all([
    prisma.sAWWeight.findMany({
      orderBy: [{ jurusanId: "asc" }, { isActive: "desc" }, { nama: "asc" }],
      select: {
        id: true,
        nama: true,
        jurusanId: true,
        isActive: true,
        bobotBidang: true,
        bobotJarak: true,
        bobotKuota: true,
        bobotKeahlian: true,
        bobotDokumen: true,
        bobotFasilitas: true,
        bobotRating: true,
        jurusan: { select: { kode: true, nama: true } },
      },
    }),
    prisma.jurusan.findMany({
      orderBy: { kode: "asc" },
      select: { id: true, kode: true, nama: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Bobot SAW</h1>
          <p className="text-sm text-muted-foreground">
            Konfigurasi bobot 7 kriteria SAW untuk rekomendasi lowongan PKL.
            Boleh per-jurusan atau global.
          </p>
        </div>
        <SAWToolbar jurusan={jurusan} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Daftar preset
            <Badge variant="secondary">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Preset aktif dipakai saat rekomendasi dihitung. Fallback ke global,
            lalu ke default bawaan sistem kalau keduanya tidak ada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jurusan</TableHead>
                  <TableHead className="w-[80px]">Status</TableHead>
                  <TableHead>Bidang</TableHead>
                  <TableHead>Jarak</TableHead>
                  <TableHead>Kuota</TableHead>
                  <TableHead>Keahlian</TableHead>
                  <TableHead>Dokumen</TableHead>
                  <TableHead>Fasilitas</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="w-[60px] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Belum ada preset bobot. Sistem akan memakai default bawaan.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nama}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.jurusan
                          ? `${r.jurusan.kode} — ${r.jurusan.nama}`
                          : "Global"}
                      </TableCell>
                      <TableCell>
                        {r.isActive ? (
                          <Badge>Aktif</Badge>
                        ) : (
                          <Badge variant="outline">Nonaktif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotBidang.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotJarak.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotKuota.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotKeahlian.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotDokumen.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotFasilitas.toFixed(2)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {r.bobotRating.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <SAWRowActions
                          data={{
                            id: r.id,
                            nama: r.nama,
                            jurusanId: r.jurusanId,
                            isActive: r.isActive,
                            bobotBidang: r.bobotBidang,
                            bobotJarak: r.bobotJarak,
                            bobotKuota: r.bobotKuota,
                            bobotKeahlian: r.bobotKeahlian,
                            bobotDokumen: r.bobotDokumen,
                            bobotFasilitas: r.bobotFasilitas,
                            bobotRating: r.bobotRating,
                          }}
                          jurusan={jurusan}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
