import Link from "next/link";
import { Building2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { STATUS_LABEL, STATUS_VARIANT } from "./status";

export const metadata = { title: "Pendaftaran Saya" };

export default async function SiswaPendaftaranPage() {
  const session = await requireRole(["SISWA"]);

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!siswa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil belum tersedia</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const pendaftaran = await prisma.pendaftaran.findMany({
    where: { siswaId: siswa.id },
    select: {
      id: true,
      status: true,
      skorSAW: true,
      createdAt: true,
      updatedAt: true,
      lowongan: {
        select: {
          id: true,
          judul: true,
          dudi: { select: { namaPerusahaan: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pendaftaran Saya</h1>
        <p className="text-sm text-muted-foreground">
          Riwayat semua pendaftaran PKL Anda. Klik salah satu untuk detail &
          timeline.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Daftar pendaftaran
            <Badge variant="secondary">{pendaftaran.length}</Badge>
          </CardTitle>
          <CardDescription>
            Jelajahi lowongan lain di menu <Link href="/siswa/lowongan" className="underline">Cari Lowongan</Link>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendaftaran.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Belum ada pendaftaran.
            </p>
          ) : (
            pendaftaran.map((p) => (
              <Link
                key={p.id}
                href={`/siswa/pendaftaran/${p.id}`}
                className="block rounded-lg border p-4 transition hover:bg-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.lowongan.judul}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {p.lowongan.dudi.namaPerusahaan}
                      </span>
                      <span>Daftar {fmt.format(p.createdAt)}</span>
                      {p.skorSAW !== null && (
                        <span>Skor {(p.skorSAW * 100).toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>
                    {STATUS_LABEL[p.status]}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
