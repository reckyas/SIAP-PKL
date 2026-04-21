import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">
          Kelola akun, master data, dan verifikasi DU/DI dari menu samping.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang</CardTitle>
          <CardDescription>
            Verifikasi DU/DI pending, tambah siswa & guru, serta atur master
            data (jurusan, keahlian, dokumen) sudah aktif di milestone ini.
            Fitur lanjutan (bobot SAW, audit log, pengumuman) akan menyusul.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Gunakan sidebar kiri untuk navigasi.
        </CardContent>
      </Card>
    </div>
  );
}
