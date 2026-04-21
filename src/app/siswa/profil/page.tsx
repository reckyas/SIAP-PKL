import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { SiswaProfilForm } from "./profil-form";

export const metadata = { title: "Profil Siswa" };

export default async function SiswaProfilPage() {
  const session = await requireRole(["SISWA"]);

  const [user, keahlianMaster, dokumenMaster, bidangMaster] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        siswa: {
          select: {
            nis: true,
            nama: true,
            jenisKelamin: true,
            tanggalLahir: true,
            alamat: true,
            latitude: true,
            longitude: true,
            noHp: true,
            fotoUrl: true,
            kelas: { select: { nama: true, tingkat: true } },
            jurusan: { select: { kode: true, nama: true } },
            guru: { select: { nama: true } },
            jarakMaksimal: true,
            bersediaKos: true,
            bidangMinat: { select: { bidangId: true } },
            keahlian: {
              select: { keahlianId: true, level: true },
            },
            dokumen: {
              select: {
                dokumenId: true,
                fileUrl: true,
                nomorDok: true,
              },
            },
          },
        },
      },
    }),
    prisma.keahlian.findMany({
      orderBy: [{ kategori: "asc" }, { nama: "asc" }],
      select: { id: true, nama: true, kategori: true },
    }),
    prisma.dokumen.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, deskripsi: true },
    }),
    prisma.bidang.findMany({
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, slug: true },
    }),
  ]);

  const siswa = user?.siswa;
  if (!siswa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil belum tersedia</CardTitle>
          <CardDescription>
            Akun Anda belum terhubung ke data siswa. Hubungi admin sekolah.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const jurusanLabel = `${siswa.jurusan.kode} — ${siswa.jurusan.nama}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profil</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi profil supaya rekomendasi PKL lebih akurat.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Data siswa</CardTitle>
          <CardDescription>
            Email, NIS, kelas, jurusan, dan guru pembimbing hanya bisa diubah
            admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiswaProfilForm
            lockedInfo={{
              email: user?.email ?? "",
              nis: siswa.nis,
              kelas: siswa.kelas
                ? `${siswa.kelas.tingkat} — ${siswa.kelas.nama}`
                : null,
              jurusanNama: jurusanLabel,
              guruNama: siswa.guru?.nama ?? null,
            }}
            defaults={{
              nama: siswa.nama,
              jenisKelamin: siswa.jenisKelamin,
              tanggalLahir: siswa.tanggalLahir,
              alamat: siswa.alamat,
              latitude: siswa.latitude,
              longitude: siswa.longitude,
              noHp: siswa.noHp,
              fotoUrl: siswa.fotoUrl,
              jarakMaksimal: siswa.jarakMaksimal,
              bersediaKos: siswa.bersediaKos,
              bidangMinat: siswa.bidangMinat.map((b) => b.bidangId),
              keahlian: siswa.keahlian.map((k) => ({
                keahlianId: k.keahlianId,
                level: k.level,
              })),
              dokumen: siswa.dokumen.map((x) => ({
                dokumenId: x.dokumenId,
                fileUrl: x.fileUrl ?? "",
                nomorDok: x.nomorDok,
              })),
            }}
            keahlianMaster={keahlianMaster}
            dokumenMaster={dokumenMaster}
            bidangMaster={bidangMaster}
          />
        </CardContent>
      </Card>
    </div>
  );
}
