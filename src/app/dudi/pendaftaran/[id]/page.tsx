import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, ChevronLeft, GraduationCap, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { STATUS_LABEL, STATUS_VARIANT } from "@/app/siswa/pendaftaran/status";
import { TimelineList } from "@/app/siswa/pendaftaran/[id]/timeline-list";
import { DudiDecisionDialog } from "./dudi-decision-dialog";
import { MarkDilihatEffect } from "./mark-dilihat-effect";

export const metadata = { title: "Detail Pendaftar" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DudiPendaftaranDetail({ params }: PageProps) {
  const session = await requireRole(["DUDI"]);
  const { id } = await params;

  const dudi = await prisma.dUDI.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!dudi) notFound();

  const p = await prisma.pendaftaran.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      skorSAW: true,
      motivasi: true,
      catatanGuru: true,
      catatanDUDI: true,
      createdAt: true,
      siswa: {
        select: {
          id: true,
          nama: true,
          nis: true,
          jenisKelamin: true,
          kelas: { select: { nama: true, tingkat: true } },
          alamat: true,
          noHp: true,
          jurusan: { select: { nama: true } },
          keahlian: {
            select: {
              level: true,
              keahlian: { select: { nama: true } },
            },
          },
          dokumen: {
            select: {
              fileUrl: true,
              verified: true,
              dokumen: { select: { nama: true } },
            },
          },
        },
      },
      lowongan: {
        select: {
          id: true,
          judul: true,
          dudiId: true,
          dudi: { select: { namaPerusahaan: true } },
        },
      },
      timeline: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          status: true,
          catatan: true,
          aktorRole: true,
          createdAt: true,
        },
      },
    },
  });

  if (!p || p.lowongan.dudiId !== dudi.id) notFound();

  const canDecide =
    p.status === "DISETUJUI_GURU" || p.status === "DILIHAT_DUDI";

  return (
    <div className="space-y-4">
      {p.status === "DISETUJUI_GURU" && (
        <MarkDilihatEffect pendaftaranId={p.id} />
      )}

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/dudi/lowongan/${p.lowongan.id}/pendaftar`}>
            <ChevronLeft className="h-4 w-4" />
            Semua pendaftar
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{p.siswa.nama}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            {p.siswa.nis}
            {p.siswa.kelas
              ? ` · ${p.siswa.kelas.tingkat} ${p.siswa.kelas.nama}`
              : ""}{" "}
            {p.siswa.jurusan.nama}
          </span>
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {p.lowongan.judul}
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Profil Siswa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Jenis kelamin"
                value={
                  p.siswa.jenisKelamin === "LAKI_LAKI" ? "Laki-laki" : "Perempuan"
                }
              />
              <InfoRow label="No. HP" value={p.siswa.noHp} />
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Alamat
                </div>
                <p className="inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{p.siswa.alamat}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {p.siswa.keahlian.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Keahlian</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {p.siswa.keahlian.map((k) => (
                    <li
                      key={k.keahlian.nama}
                      className="flex items-center justify-between border-b pb-1 last:border-0"
                    >
                      <span>{k.keahlian.nama}</span>
                      <Badge variant="outline">Level {k.level}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {p.siswa.dokumen.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dokumen</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {p.siswa.dokumen.map((d) => (
                    <li
                      key={d.dokumen.nama}
                      className="flex items-center justify-between border-b pb-1 last:border-0"
                    >
                      <span>{d.dokumen.nama}</span>
                      <div className="flex items-center gap-2">
                        {d.verified && (
                          <Badge variant="secondary">Terverifikasi</Badge>
                        )}
                        {d.fileUrl ? (
                          <a
                            href={d.fileUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary hover:underline"
                          >
                            Lihat
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Tidak ada file
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {p.motivasi && (
            <Card>
              <CardHeader>
                <CardTitle>Motivasi</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {p.motivasi}
              </CardContent>
            </Card>
          )}

          {p.catatanGuru && (
            <Card>
              <CardHeader>
                <CardTitle>Catatan dari Guru</CardTitle>
              </CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">
                {p.catatanGuru}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Riwayat status pendaftaran ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineList entries={p.timeline} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Sekarang
                </span>
                <Badge variant={STATUS_VARIANT[p.status]}>
                  {STATUS_LABEL[p.status]}
                </Badge>
              </div>
              {p.skorSAW !== null && (
                <InfoRow
                  label="Skor SAW"
                  value={(p.skorSAW * 100).toFixed(2)}
                />
              )}
              {canDecide ? (
                <DudiDecisionDialog
                  pendaftaranId={p.id}
                  siswaNama={p.siswa.nama}
                  lowonganJudul={p.lowongan.judul}
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pendaftaran sudah diputuskan. Tidak bisa diubah lagi.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
