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
import { GuruImportForm } from "./import-form";

export const metadata = { title: "Import Guru" };

export default function GuruImportPage() {
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
          <CardTitle>Import Guru dari Excel</CardTitle>
          <CardDescription>
            Upload file .xlsx sesuai template. Validasi dijalankan untuk semua
            baris — jika ada <strong>satu saja</strong> error, import dibatalkan
            total (tidak ada data yang masuk).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GuruImportForm />
        </CardContent>
      </Card>
    </div>
  );
}
