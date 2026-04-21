import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeahlianImportForm } from "./import-form";

export const metadata = { title: "Import Keahlian" };

export default function KeahlianImportPage() {
  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/keahlian">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Import Keahlian dari Excel</CardTitle>
          <CardDescription>
            Upload file .xlsx sesuai template. Validasi dijalankan untuk semua
            baris — jika ada <strong>satu saja</strong> error, import dibatalkan
            total (tidak ada data yang masuk).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <KeahlianImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
