import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { DudiProfilForm } from "./profil-form";

export const metadata = { title: "Profil Perusahaan" };

export default async function DudiProfilPage() {
  const session = await requireRole(["DUDI"]);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      dudi: {
        select: {
          namaPerusahaan: true,
          deskripsi: true,
          logoUrl: true,
          websiteUrl: true,
          alamat: true,
          latitude: true,
          longitude: true,
          namaPIC: true,
          jabatanPIC: true,
          noHpPIC: true,
          emailPIC: true,
          bidangUsaha: true,
          fotoUrls: true,
        },
      },
    },
  });

  const d = user?.dudi;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profil Perusahaan</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi data perusahaan supaya siswa bisa menilai dan memilih DU/DI
          Anda.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Data perusahaan</CardTitle>
          <CardDescription>
            Data ini tampil di halaman detail perusahaan dan lowongan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DudiProfilForm
            email={user?.email ?? ""}
            defaults={{
              namaPerusahaan: d?.namaPerusahaan ?? "",
              deskripsi: d?.deskripsi ?? "",
              logoUrl: d?.logoUrl ?? null,
              websiteUrl: d?.websiteUrl ?? "",
              alamat: d?.alamat ?? "",
              latitude: d?.latitude ?? -7.8681,
              longitude: d?.longitude ?? 111.4622,
              namaPIC: d?.namaPIC ?? "",
              jabatanPIC: d?.jabatanPIC ?? "",
              noHpPIC: d?.noHpPIC ?? "",
              emailPIC: d?.emailPIC ?? "",
              bidangUsaha: d?.bidangUsaha ?? [],
              fotoUrls: d?.fotoUrls ?? [],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
