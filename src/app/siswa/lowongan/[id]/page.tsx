import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Building2, MapPin, ExternalLink } from "lucide-react";

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
import { STATUS_LABEL } from "@/app/siswa/pendaftaran/status";
import { DaftarButton } from "./daftar-button";

export const metadata = { title: "Detail Lowongan" };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LowonganDetailPage({ params }: PageProps) {
  const session = await requireRole(["SISWA"]);
  const { id } = await params;

  const lowongan = await prisma.lowongan.findUnique({
    where: { id },
    select: {
      id: true,
      judul: true,
      deskripsi: true,
      bidang: { select: { bidang: { select: { id: true, nama: true } } } },
      kuotaTotal: true,
      kuotaLaki: true,
      kuotaPerempuan: true,
      terisiLaki: true,
      terisiPerempuan: true,
      tanggalMulai: true,
      tanggalSelesai: true,
      nilaiMinimum: true,
      uangSaku: true,
      makanSiang: true,
      transport: true,
      fasilitasLain: true,
      jamKerja: true,
      hariKerja: true,
      dressCode: true,
      catatanKhusus: true,
      status: true,
      keahlianDibutuhkan: {
        select: {
          levelMinimum: true,
          keahlian: { select: { nama: true } },
        },
      },
      dokumenDibutuhkan: {
        select: {
          wajib: true,
          dokumen: { select: { nama: true } },
        },
      },
      dudi: {
        select: {
          namaPerusahaan: true,
          deskripsi: true,
          logoUrl: true,
          websiteUrl: true,
          alamat: true,
          bidangUsaha: true,
          ratingRataRata: true,
          jumlahReview: true,
          namaPIC: true,
          jabatanPIC: true,
        },
      },
    },
  });

  if (!lowongan) notFound();

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: { id: true, statusPKL: true, guruId: true },
  });

  const existing = siswa
    ? await prisma.pendaftaran.findUnique({
        where: {
          siswaId_lowonganId: { siswaId: siswa.id, lowonganId: id },
        },
        select: { id: true, status: true },
      })
    : null;

  if (lowongan.status !== "OPEN") {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Lowongan tidak tersedia</CardTitle>
            <CardDescription>
              Lowongan ini sedang tidak membuka pendaftaran.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const terisi = lowongan.terisiLaki + lowongan.terisiPerempuan;
  const sisa = Math.max(0, lowongan.kuotaTotal - terisi);
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Semua lowongan
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{lowongan.judul}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {lowongan.dudi.namaPerusahaan}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {lowongan.dudi.alamat}
          </span>
        </div>
        {lowongan.bidang.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {lowongan.bidang.map((b) => (
              <Badge key={b.bidang.id} variant="secondary">
                {b.bidang.nama}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Deskripsi</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">
              {lowongan.deskripsi}
            </CardContent>
          </Card>

          {lowongan.keahlianDibutuhkan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Keahlian yang dibutuhkan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {lowongan.keahlianDibutuhkan.map((k) => (
                    <li
                      key={k.keahlian.nama}
                      className="flex items-center justify-between border-b pb-1 last:border-0"
                    >
                      <span>{k.keahlian.nama}</span>
                      <Badge variant="outline">
                        Min. level {k.levelMinimum}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {lowongan.dokumenDibutuhkan.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dokumen yang dibutuhkan</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {lowongan.dokumenDibutuhkan.map((d) => (
                    <li
                      key={d.dokumen.nama}
                      className="flex items-center justify-between border-b pb-1 last:border-0"
                    >
                      <span>{d.dokumen.nama}</span>
                      <Badge variant={d.wajib ? "default" : "outline"}>
                        {d.wajib ? "Wajib" : "Opsional"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {(lowongan.jamKerja ||
            lowongan.hariKerja ||
            lowongan.dressCode ||
            lowongan.catatanKhusus) && (
            <Card>
              <CardHeader>
                <CardTitle>Aturan kerja</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {lowongan.jamKerja && (
                  <InfoRow label="Jam kerja" value={lowongan.jamKerja} />
                )}
                {lowongan.hariKerja && (
                  <InfoRow label="Hari kerja" value={lowongan.hariKerja} />
                )}
                {lowongan.dressCode && (
                  <InfoRow label="Dress code" value={lowongan.dressCode} />
                )}
                {lowongan.catatanKhusus && (
                  <div>
                    <div className="text-xs font-medium text-muted-foreground">
                      Catatan khusus
                    </div>
                    <p className="whitespace-pre-wrap">
                      {lowongan.catatanKhusus}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow
                label="Periode"
                value={`${fmt.format(lowongan.tanggalMulai)} – ${fmt.format(
                  lowongan.tanggalSelesai,
                )}`}
              />
              <InfoRow
                label="Kuota"
                value={`${terisi}/${lowongan.kuotaTotal} terisi · ${sisa} tersisa`}
              />
              <InfoRow
                label="Rasio L/P"
                value={`${lowongan.kuotaLaki} / ${lowongan.kuotaPerempuan}`}
              />
              {lowongan.nilaiMinimum !== null && (
                <InfoRow
                  label="Nilai minimum"
                  value={lowongan.nilaiMinimum.toFixed(2)}
                />
              )}
              {lowongan.uangSaku !== null && lowongan.uangSaku > 0 && (
                <InfoRow
                  label="Uang saku"
                  value={`Rp${lowongan.uangSaku.toLocaleString("id-ID")}`}
                />
              )}
              <InfoRow
                label="Fasilitas"
                value={
                  [
                    lowongan.makanSiang ? "Makan siang" : null,
                    lowongan.transport ? "Transport" : null,
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              {lowongan.fasilitasLain && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Fasilitas lain
                  </div>
                  <p className="whitespace-pre-wrap">
                    {lowongan.fasilitasLain}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tentang Perusahaan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-semibold">
                {lowongan.dudi.namaPerusahaan}
              </div>
              {lowongan.dudi.deskripsi && (
                <p className="text-muted-foreground">
                  {lowongan.dudi.deskripsi}
                </p>
              )}
              {lowongan.dudi.bidangUsaha.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lowongan.dudi.bidangUsaha.map((b) => (
                    <Badge key={b} variant="outline" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
              {lowongan.dudi.ratingRataRata !== null && (
                <div>
                  ⭐ {lowongan.dudi.ratingRataRata.toFixed(1)} ·{" "}
                  {lowongan.dudi.jumlahReview} review
                </div>
              )}
              <InfoRow label="PIC" value={lowongan.dudi.namaPIC} />
              {lowongan.dudi.jabatanPIC && (
                <InfoRow label="Jabatan" value={lowongan.dudi.jabatanPIC} />
              )}
              {lowongan.dudi.websiteUrl && (
                <a
                  href={lowongan.dudi.websiteUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Website
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pendaftaran</CardTitle>
              <CardDescription>
                {existing
                  ? `Anda sudah mendaftar — status: ${STATUS_LABEL[existing.status]}.`
                  : sisa > 0
                    ? "Kirim pendaftaran; guru pembimbing akan review dulu sebelum diteruskan ke DU/DI."
                    : "Kuota sudah penuh."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {existing ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/siswa/pendaftaran/${existing.id}`}>
                    Lihat pendaftaran saya
                  </Link>
                </Button>
              ) : !siswa ? (
                <Button disabled className="w-full">
                  Profil belum siap
                </Button>
              ) : siswa.statusPKL === "DITERIMA" ||
                siswa.statusPKL === "SEDANG_PKL" ? (
                <DaftarButton
                  lowonganId={lowongan.id}
                  disabled
                  disabledReason="Anda sudah diterima di lowongan lain"
                />
              ) : sisa <= 0 ? (
                <DaftarButton
                  lowonganId={lowongan.id}
                  disabled
                  disabledReason="Kuota penuh"
                />
              ) : !siswa.guruId ? (
                <DaftarButton
                  lowonganId={lowongan.id}
                  disabled
                  disabledReason="Guru pembimbing belum ditentukan admin"
                />
              ) : (
                <DaftarButton lowonganId={lowongan.id} />
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
