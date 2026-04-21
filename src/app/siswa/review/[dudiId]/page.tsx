import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft } from "lucide-react";

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
import { ReviewForm } from "../review-form";

export const metadata = { title: "Tulis Review" };

interface PageProps {
  params: Promise<{ dudiId: string }>;
}

export default async function SiswaReviewFormPage({ params }: PageProps) {
  const session = await requireRole(["SISWA"]);
  const { dudiId } = await params;

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true, statusPKL: true },
  });
  if (!siswa) notFound();

  const pernahDiterima = await prisma.pendaftaran.findFirst({
    where: {
      siswaId: siswa.id,
      status: "DITERIMA",
      lowongan: { dudiId },
    },
    select: { id: true },
  });
  if (!pernahDiterima) notFound();

  const dudi = await prisma.dUDI.findUnique({
    where: { id: dudiId },
    select: { id: true, namaPerusahaan: true, bidangUsaha: true },
  });
  if (!dudi) notFound();

  if (siswa.statusPKL !== "SELESAI") {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/review">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>PKL belum selesai</CardTitle>
            <CardDescription>
              Review hanya bisa dikirim setelah Anda menandai PKL selesai
              melalui halaman logbook.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const existing = await prisma.reviewDUDI.findUnique({
    where: { siswaId_dudiId: { siswaId: siswa.id, dudiId } },
    select: { rating: true, komentar: true, anonim: true },
  });

  const defaults = {
    dudiId: dudi.id,
    rating: existing?.rating ?? 0,
    komentar: existing?.komentar ?? "",
    anonim: existing?.anonim ?? false,
  };

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/review">
            <ChevronLeft className="h-4 w-4" />
            Daftar review
          </Link>
        </Button>
        <h1 className="text-2xl font-bold inline-flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {existing ? "Edit review" : "Tulis review"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {dudi.namaPerusahaan} · {dudi.bidangUsaha.join(", ")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ulasan & rating</CardTitle>
          <CardDescription>
            Jujur dan konstruktif. Review Anda membantu siswa lain memilih
            tempat PKL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewForm
            mode={existing ? "edit" : "create"}
            defaults={defaults}
          />
        </CardContent>
      </Card>
    </div>
  );
}
