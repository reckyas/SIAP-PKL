import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { DudiForm } from "../dudi-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRole } from "@/lib/session";

export const metadata = { title: "Tambah DU/DI" };

export default async function DudiBaruPage() {
  await requireRole(["ADMIN"]);

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/dudi">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tambah DU/DI</CardTitle>
          <CardDescription>
            Buat akun perusahaan mitra. Akun langsung aktif (status VERIFIED) —
            tidak perlu masuk antrian verifikasi. DU/DI akan diminta ganti
            password saat login pertama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DudiForm />
        </CardContent>
      </Card>
    </div>
  );
}
