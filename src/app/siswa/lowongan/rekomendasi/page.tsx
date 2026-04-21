import Link from "next/link";
import { ChevronLeft, Building2, MapPin, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  computeSAW,
  pickWeight,
  type SAWLowonganInput,
  type SAWSiswaInput,
  type SAWWeightRecord,
} from "@/lib/saw";

export const metadata = { title: "Rekomendasi Lowongan" };

export default async function RekomendasiLowonganPage() {
  const session = await requireRole(["SISWA"]);

  const siswa = await prisma.siswa.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      jurusanId: true,
      latitude: true,
      longitude: true,
      jarakMaksimal: true,
      bidangMinat: { select: { bidangId: true } },
      keahlian: { select: { keahlianId: true, level: true } },
      dokumen: {
        select: { dokumenId: true, fileUrl: true },
      },
    },
  });

  if (!siswa) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profil belum tersedia</CardTitle>
          <CardDescription>
            Akun Anda belum terhubung ke data siswa.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const profilLengkap =
    siswa.latitude !== null &&
    siswa.longitude !== null &&
    siswa.bidangMinat.length > 0;

  const [lowonganRows, weightRows] = await Promise.all([
    prisma.lowongan.findMany({
      where: {
        status: "OPEN",
        jurusanTarget: { some: { jurusanId: siswa.jurusanId } },
      },
      select: {
        id: true,
        judul: true,
        bidang: { select: { bidangId: true } },
        kuotaTotal: true,
        terisiLaki: true,
        terisiPerempuan: true,
        uangSaku: true,
        makanSiang: true,
        transport: true,
        keahlianDibutuhkan: {
          select: { keahlianId: true, levelMinimum: true },
        },
        dokumenDibutuhkan: {
          select: { dokumenId: true, wajib: true },
        },
        jurusanTarget: {
          select: { jurusanId: true },
        },
        dudi: {
          select: {
            namaPerusahaan: true,
            alamat: true,
            latitude: true,
            longitude: true,
            ratingRataRata: true,
          },
        },
      },
    }),
    prisma.sAWWeight.findMany({
      select: {
        id: true,
        jurusanId: true,
        isActive: true,
        bobotBidang: true,
        bobotJarak: true,
        bobotKuota: true,
        bobotKeahlian: true,
        bobotDokumen: true,
        bobotFasilitas: true,
        bobotRating: true,
      },
    }),
  ]);

  const weight = pickWeight(weightRows as SAWWeightRecord[], siswa.jurusanId);

  const siswaInput: SAWSiswaInput = {
    jurusanId: siswa.jurusanId,
    latitude: siswa.latitude,
    longitude: siswa.longitude,
    jarakMaksimal: siswa.jarakMaksimal,
    bidangMinat: siswa.bidangMinat.map((b) => b.bidangId),
    keahlian: siswa.keahlian,
    dokumen: siswa.dokumen,
  };

  const lowonganInput: SAWLowonganInput[] = lowonganRows.map((l) => ({
    id: l.id,
    bidang: l.bidang.map((b) => b.bidangId),
    jurusanIds: l.jurusanTarget.map((j) => j.jurusanId),
    latitude: l.dudi.latitude,
    longitude: l.dudi.longitude,
    kuotaTotal: l.kuotaTotal,
    terisiLaki: l.terisiLaki,
    terisiPerempuan: l.terisiPerempuan,
    keahlianDibutuhkan: l.keahlianDibutuhkan,
    dokumenDibutuhkan: l.dokumenDibutuhkan,
    uangSaku: l.uangSaku,
    makanSiang: l.makanSiang,
    transport: l.transport,
    dudiRating: l.dudi.ratingRataRata,
  }));

  const scored = computeSAW(siswaInput, lowonganInput, weight);
  const byId = new Map(lowonganRows.map((l) => [l.id, l]));
  const ranked = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((s) => ({ ...s, lowongan: byId.get(s.lowonganId)! }))
    .filter((r) => r.lowongan);

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/siswa/lowongan">
            <ChevronLeft className="h-4 w-4" />
            Semua lowongan
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Rekomendasi untuk Anda
        </h1>
        <p className="text-sm text-muted-foreground">
          Hanya lowongan yang menerima jurusan Anda yang ditampilkan. Sisanya
          diurutkan dengan SAW (Simple Additive Weighting) berdasarkan 7
          kriteria: keahlian (primer), jarak, bidang, dokumen, rating DU/DI,
          kuota, dan fasilitas.
        </p>
      </div>

      {!profilLengkap && (
        <Alert>
          <AlertTitle>Profil belum lengkap</AlertTitle>
          <AlertDescription>
            Tambahkan koordinat rumah dan bidang minat di{" "}
            <Link href="/siswa/profil" className="underline">
              Profil
            </Link>{" "}
            agar skor jarak & kesesuaian lebih akurat.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {ranked.length === 0
              ? "Belum ada lowongan terbuka"
              : `Top ${Math.min(ranked.length, 20)} dari ${ranked.length} lowongan`}
          </CardTitle>
          <CardDescription>
            Skor 0–100. Klik salah satu untuk detail & rincian bobot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ranked.slice(0, 20).map((r, idx) => {
            const l = r.lowongan;
            const terisi = l.terisiLaki + l.terisiPerempuan;
            const sisa = Math.max(0, l.kuotaTotal - terisi);
            return (
              <Link
                key={l.id}
                href={`/siswa/lowongan/${l.id}`}
                className="block rounded-lg border p-4 transition hover:bg-accent"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        #{idx + 1}
                      </Badge>
                      <h3 className="font-semibold">{l.judul}</h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {l.dudi.namaPerusahaan}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {r.raw.jarak > 0
                          ? `${r.raw.jarak.toFixed(1)} km`
                          : "—"}
                      </span>
                      {l.dudi.ratingRataRata !== null && (
                        <span>⭐ {l.dudi.ratingRataRata.toFixed(1)}</span>
                      )}
                      <span>Sisa {sisa} slot</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {(r.score * 100).toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">skor</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs sm:grid-cols-4 md:grid-cols-7">
                  <BreakdownCell label="Bidang" value={r.normalized.bidang} />
                  <BreakdownCell label="Jarak" value={r.normalized.jarak} />
                  <BreakdownCell label="Kuota" value={r.normalized.kuota} />
                  <BreakdownCell
                    label="Keahlian"
                    value={r.normalized.keahlian}
                  />
                  <BreakdownCell label="Dokumen" value={r.normalized.dokumen} />
                  <BreakdownCell
                    label="Fasilitas"
                    value={r.normalized.fasilitas}
                  />
                  <BreakdownCell label="Rating" value={r.normalized.rating} />
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function BreakdownCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-muted px-2 py-1">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-mono text-xs font-semibold">
        {(value * 100).toFixed(0)}
      </div>
    </div>
  );
}
