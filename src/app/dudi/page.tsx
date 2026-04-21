import Link from "next/link";
import { Briefcase, Plus, UserCircle2 } from "lucide-react";

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

export default async function DudiDashboardPage() {
  const session = await requireRole(["DUDI"]);
  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      namaPerusahaan: true,
      lowongan: {
        select: { status: true, _count: { select: { pendaftaran: true } } },
      },
    },
  });

  const counts = {
    DRAFT: 0,
    OPEN: 0,
    CLOSED: 0,
    FULL: 0,
    pendaftar: 0,
  };
  for (const l of dudi?.lowongan ?? []) {
    counts[l.status] += 1;
    counts.pendaftar += l._count.pendaftaran;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard DU/DI</h1>
        <p className="text-sm text-muted-foreground">
          {dudi?.namaPerusahaan
            ? `Selamat datang, ${dudi.namaPerusahaan}.`
            : "Selamat datang."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Draft" value={counts.DRAFT} />
        <StatCard label="Terbuka" value={counts.OPEN} highlight />
        <StatCard label="Ditutup" value={counts.CLOSED} />
        <StatCard label="Pendaftar" value={counts.pendaftar} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Manajemen lowongan
            </CardTitle>
            <CardDescription>
              Buat lowongan PKL, atur kuota & persyaratan, lalu publikasikan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild>
              <Link href="/dudi/lowongan/baru">
                <Plus className="h-4 w-4" />
                Lowongan baru
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dudi/lowongan">Lihat daftar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle2 className="h-4 w-4" />
              Profil perusahaan
            </CardTitle>
            <CardDescription>
              Profil lengkap membantu siswa mengenal perusahaan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dudi/profil">Update profil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div
          className={`text-3xl font-bold ${
            highlight ? "text-primary" : ""
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

