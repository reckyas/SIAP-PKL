import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">SIAP PKL</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild>
            <Link href="/register/dudi">
              Daftar DU/DI <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="container py-20 text-center">
        <p className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          SMKN 1 Badegan
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Rekomendasi tempat PKL terbaik,
          <br className="hidden sm:block" /> berbasis data dan metode SAW.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          SIAP PKL menghubungkan siswa, guru pembimbing, dan DU/DI dalam satu
          platform. Cari lowongan, dapatkan rekomendasi personal, dan kelola
          seluruh alur PKL — dari pendaftaran sampai penilaian akhir.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/login">Masuk ke akun</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/register/dudi">Daftar sebagai DU/DI</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Akun siswa & guru dibuat oleh admin sekolah. Perusahaan mitra bisa
          mendaftar mandiri.
        </p>
      </section>

      <section className="container grid gap-4 pb-24 md:grid-cols-3">
        <Card>
          <CardHeader>
            <GraduationCap className="mb-2 h-6 w-6 text-primary" />
            <CardTitle>Untuk Siswa</CardTitle>
            <CardDescription>
              Temukan lowongan PKL yang sesuai minat, keahlian, dan jarak dari
              rumah. Lihat skor rekomendasi transparan.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Briefcase className="mb-2 h-6 w-6 text-primary" />
            <CardTitle>Untuk DU/DI</CardTitle>
            <CardDescription>
              Publish lowongan, atur kuota & persyaratan, review pendaftar, dan
              nilai hasil PKL siswa.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <ShieldCheck className="mb-2 h-6 w-6 text-primary" />
            <CardTitle>Untuk Guru & Admin</CardTitle>
            <CardDescription>
              Approve pendaftaran siswa bimbingan, pantau logbook, dan atur
              bobot kriteria SAW.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Akun Guru & Admin dibuat oleh Admin sekolah.
          </CardContent>
        </Card>
      </section>

      <footer className="border-t bg-muted/20">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SMKN 1 Badegan · SIAP PKL
        </div>
      </footer>
    </main>
  );
}
