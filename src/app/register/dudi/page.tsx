import Link from "next/link";

import { DudiRegisterForm } from "./register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Daftar DU/DI" };

export default function RegisterDudiPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar DU/DI (Perusahaan)</CardTitle>
        <CardDescription>
          Isi formulir berikut untuk mendaftar sebagai mitra PKL SMKN 1 Badegan.
          Akun Anda akan diverifikasi admin terlebih dahulu sebelum dapat
          digunakan. Siswa tidak bisa mendaftar mandiri — akun siswa & guru
          dikelola langsung oleh admin sekolah.{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sudah punya akun? Masuk di sini.
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DudiRegisterForm />
      </CardContent>
    </Card>
  );
}
