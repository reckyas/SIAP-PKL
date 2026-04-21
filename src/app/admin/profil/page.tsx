import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { AdminProfilForm } from "./profil-form";

export const metadata = { title: "Profil Admin" };

export default async function AdminProfilPage() {
  const session = await requireRole(["ADMIN"]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      admin: {
        select: {
          nama: true,
          jabatan: true,
          nip: true,
          noHp: true,
          fotoUrl: true,
        },
      },
    },
  });

  const a = user?.admin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Perbarui informasi akun admin Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Data akun</CardTitle>
          <CardDescription>
            Nama akan tampil di header sidebar dan di audit log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminProfilForm
            email={user?.email ?? ""}
            defaults={{
              nama: a?.nama ?? "",
              jabatan: a?.jabatan ?? "",
              nip: a?.nip ?? "",
              noHp: a?.noHp ?? "",
              fotoUrl: a?.fotoUrl ?? null,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
