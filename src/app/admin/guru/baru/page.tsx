import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { GuruForm } from "../guru-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Tambah Guru" };

export default function GuruBaruPage() {
  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/guru">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tambah Guru Pembimbing</CardTitle>
          <CardDescription>
            Buat akun guru pembimbing. Password awal default = NIP (atau
            <code className="mx-1">guru12345</code> kalau NIP kosong/pendek).
            Guru wajib ganti password saat login pertama.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuruForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
