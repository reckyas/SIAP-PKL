import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { BLANK_LOGBOOK, LogbookForm } from "../logbook-form";

export const metadata = { title: "Entry Logbook Baru" };

export default async function LogbookBaruPage() {
  const session = await requireRole(["SISWA"]);

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { statusPKL: true },
  });
  if (!siswa || siswa.statusPKL !== "SEDANG_PKL") {
    redirect("/siswa/logbook");
  }

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/logbook">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Entry logbook baru</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catat kegiatan</CardTitle>
          <CardDescription>
            Simpan sebagai draf, lalu kirim ke guru untuk review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogbookForm mode="create" defaults={BLANK_LOGBOOK} />
        </CardContent>
      </Card>
    </div>
  );
}
