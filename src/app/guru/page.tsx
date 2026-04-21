import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GuruDashboardPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dashboard Guru Pembimbing</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi profil Anda terlebih dahulu. Fitur bimbingan akan aktif pada
          milestone berikutnya.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Siswa bimbingan, antrian approval pendaftaran, review logbook, dan
            penilaian akhir.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Gunakan menu Profil di sidebar untuk memperbarui data Anda.
        </CardContent>
      </Card>
    </div>
  );
}
