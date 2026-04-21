import Link from "next/link";
import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Masuk ke SIAP PKL</CardTitle>
        <CardDescription>
          Gunakan akun terdaftar. Untuk Guru & Admin, hubungi administrator
          sekolah.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Belum punya akun?{" "}
        <Link
          href="/register"
          className="ml-1 font-medium text-primary hover:underline"
        >
          Daftar di sini
        </Link>
      </CardFooter>
    </Card>
  );
}
