import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { prisma } from "@/lib/db";
import { GuruForm, type GuruFormDefaults } from "../../guru-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Edit Guru" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GuruEditPage({ params }: PageProps) {
  const { id } = await params;

  const guru = await prisma.guru.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      nip: true,
      noHp: true,
      mataPelajaran: true,
      user: { select: { email: true } },
    },
  });
  if (!guru) notFound();

  const defaults: GuruFormDefaults = {
    email: guru.user.email,
    nama: guru.nama,
    nip: guru.nip ?? "",
    noHp: guru.noHp,
    mataPelajaran: guru.mataPelajaran ?? "",
  };

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
          <CardTitle>Edit Guru Pembimbing</CardTitle>
          <CardDescription>Perbarui data guru {guru.nama}.</CardDescription>
        </CardHeader>
        <CardContent>
          <GuruForm mode="edit" guruId={guru.id} defaults={defaults} />
        </CardContent>
      </Card>
    </div>
  );
}
