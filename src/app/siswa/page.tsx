import Link from "next/link";
import { Search, Sparkles, UserCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";

export default async function SiswaDashboardPage() {
  const session = await requireRole(["SISWA"]);

  const [siswa, lowonganOpen] = await Promise.all([
    prisma.siswa.findUnique({
      where: { userId: session.user.id },
      select: {
        nama: true,
        latitude: true,
        longitude: true,
        _count: { select: { bidangMinat: true, keahlian: true } },
      },
    }),
    prisma.lowongan.count({ where: { status: "OPEN" } }),
  ]);

  const profilLengkap =
    siswa !== null &&
    siswa.latitude !== null &&
    siswa.longitude !== null &&
    siswa._count.bidangMinat > 0 &&
    siswa._count.keahlian > 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Siswa</h1>
        <p className="text-sm text-muted-foreground">
          {siswa?.nama ? `Halo, ${siswa.nama}!` : "Halo!"} Jelajahi lowongan
          PKL yang cocok untuk Anda.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Rekomendasi untuk Anda
            </CardTitle>
            <CardDescription>
              {profilLengkap
                ? "Lihat lowongan yang paling cocok berdasarkan profil Anda."
                : "Lengkapi profil (koordinat, bidang minat, keahlian) untuk hasil optimal."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/siswa/lowongan/rekomendasi">Lihat rekomendasi</Link>
            </Button>
            {!profilLengkap && (
              <Button asChild variant="outline">
                <Link href="/siswa/profil">
                  <UserCircle2 className="h-4 w-4" />
                  Lengkapi profil
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Cari lowongan
            </CardTitle>
            <CardDescription>
              Ada <strong>{lowonganOpen}</strong> lowongan sedang terbuka.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/siswa/lowongan">Jelajahi</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
