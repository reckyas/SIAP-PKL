import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { GuruProfilForm } from "./profil-form";

export const metadata = { title: "Profil Guru" };

export default async function GuruProfilPage() {
  const session = await requireRole(["GURU_PEMBIMBING"]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      guru: {
        select: {
          nama: true,
          nip: true,
          noHp: true,
          mataPelajaran: true,
          fotoUrl: true,
        },
      },
    },
  });

  const g = user?.guru;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Data profil Anda akan tampil di halaman siswa bimbingan.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Data guru</CardTitle>
          <CardDescription>
            NIP dikelola admin — silakan hubungi admin bila ada perubahan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuruProfilForm
            email={user?.email ?? ""}
            defaults={{
              nama: g?.nama ?? "",
              nip: g?.nip ?? "",
              noHp: g?.noHp ?? "",
              mataPelajaran: g?.mataPelajaran ?? "",
              fotoUrl: g?.fotoUrl ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
