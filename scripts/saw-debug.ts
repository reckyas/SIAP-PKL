/**
 * Debug script: dump current DB state & re-run SAW untuk tiap siswa yg
 * profilnya cukup, lalu print breakdown-nya. Dipakai untuk evaluasi apakah
 * hasil rekomendasi masuk akal terhadap data yang di-input.
 *
 * Jalankan: `npx tsx scripts/saw-debug.ts`
 *
 * Fungsi SAW di-inline di sini (bukan import dari src/lib/saw.ts)
 * karena src/lib/saw.ts pakai `import "server-only"` yang tidak bisa
 * diresolve di Node CLI. Logicnya harus identik.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface SAWSiswaInput {
  latitude: number | null;
  longitude: number | null;
  jarakMaksimal: number | null;
  bidangMinat: string[];
  keahlian: { keahlianId: string; level: number }[];
  dokumen: { dokumenId: string; fileUrl: string | null }[];
}
interface SAWLowonganInput {
  id: string;
  bidang: string[];
  latitude: number;
  longitude: number;
  kuotaTotal: number;
  terisiLaki: number;
  terisiPerempuan: number;
  keahlianDibutuhkan: { keahlianId: string; levelMinimum: number }[];
  dokumenDibutuhkan: { dokumenId: string; wajib: boolean }[];
  uangSaku: number | null;
  makanSiang: boolean;
  transport: boolean;
  dudiRating: number | null;
}
interface SAWWeightValues {
  bobotBidang: number;
  bobotJarak: number;
  bobotKuota: number;
  bobotKeahlian: number;
  bobotDokumen: number;
  bobotFasilitas: number;
  bobotRating: number;
}

const DEFAULT_WEIGHT: SAWWeightValues = {
  bobotBidang: 0.25,
  bobotJarak: 0.15,
  bobotKuota: 0.1,
  bobotKeahlian: 0.2,
  bobotDokumen: 0.1,
  bobotFasilitas: 0.1,
  bobotRating: 0.1,
};

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function rawBidang(sb: string[], lb: string[]): number {
  if (lb.length === 0) return 0;
  const set = new Set(lb.map((x) => x.toLowerCase()));
  return sb.filter((b) => set.has(b.toLowerCase())).length / lb.length;
}
function rawJarakKm(
  siswa: { lat: number | null; lng: number | null },
  low: { lat: number; lng: number },
): number | null {
  if (siswa.lat === null || siswa.lng === null) return null;
  return haversineKm({ lat: siswa.lat, lng: siswa.lng }, low);
}
function rawKuota(l: SAWLowonganInput): number {
  return Math.max(0, l.kuotaTotal - (l.terisiLaki + l.terisiPerempuan));
}
function rawKeahlian(
  siswa: { keahlianId: string; level: number }[],
  need: { keahlianId: string; levelMinimum: number }[],
): number {
  if (need.length === 0) return 1;
  const map = new Map(siswa.map((k) => [k.keahlianId, k.level]));
  let sum = 0;
  for (const n of need) {
    const lvl = map.get(n.keahlianId);
    if (lvl === undefined) continue;
    sum += Math.min(lvl, n.levelMinimum) / n.levelMinimum;
  }
  return sum / need.length;
}
function rawDokumen(
  siswaDocs: { dokumenId: string; fileUrl: string | null }[],
  need: { dokumenId: string; wajib: boolean }[],
): number {
  const wajib = need.filter((d) => d.wajib);
  if (wajib.length === 0) return 1;
  const siswaSet = new Set(
    siswaDocs
      .filter((d) => d.fileUrl && d.fileUrl.length > 0)
      .map((d) => d.dokumenId),
  );
  return wajib.filter((d) => siswaSet.has(d.dokumenId)).length / wajib.length;
}
function rawFasilitas(l: SAWLowonganInput): number {
  let c = 0;
  if (l.uangSaku && l.uangSaku > 0) c++;
  if (l.makanSiang) c++;
  if (l.transport) c++;
  return c;
}

function computeSAW(
  siswa: SAWSiswaInput,
  lowongan: SAWLowonganInput[],
  weight: SAWWeightValues,
) {
  if (lowongan.length === 0) return [];
  const raw = lowongan.map((l) => ({
    id: l.id,
    bidang: rawBidang(siswa.bidangMinat, l.bidang),
    jarakKm: rawJarakKm(
      { lat: siswa.latitude, lng: siswa.longitude },
      { lat: l.latitude, lng: l.longitude },
    ),
    kuota: rawKuota(l),
    keahlian: rawKeahlian(siswa.keahlian, l.keahlianDibutuhkan),
    dokumen: rawDokumen(siswa.dokumen, l.dokumenDibutuhkan),
    fasilitas: rawFasilitas(l),
    rating: l.dudiRating ?? 0,
  }));
  const maxBidang = Math.max(0, ...raw.map((r) => r.bidang));
  const validJarak = raw
    .map((r) => r.jarakKm)
    .filter((x): x is number => x !== null);
  const minJarak = validJarak.length > 0 ? Math.min(...validJarak) : 0;
  const maxKuota = Math.max(0, ...raw.map((r) => r.kuota));
  const maxKeahlian = Math.max(0, ...raw.map((r) => r.keahlian));
  const maxDokumen = Math.max(0, ...raw.map((r) => r.dokumen));
  const maxFasilitas = Math.max(0, ...raw.map((r) => r.fasilitas));
  const maxRating = Math.max(0, ...raw.map((r) => r.rating));
  return raw.map((r) => {
    const nBidang = maxBidang > 0 ? r.bidang / maxBidang : 0;
    let nJarak: number;
    if (r.jarakKm === null) nJarak = 0.5;
    else if (r.jarakKm <= 0) nJarak = 1;
    else if (minJarak <= 0) nJarak = 0;
    else nJarak = minJarak / r.jarakKm;
    if (
      r.jarakKm !== null &&
      siswa.jarakMaksimal &&
      r.jarakKm > siswa.jarakMaksimal
    ) {
      nJarak = nJarak * 0.5;
    }
    const nKuota = maxKuota > 0 ? r.kuota / maxKuota : 0;
    const nKeahlian = maxKeahlian > 0 ? r.keahlian / maxKeahlian : 0;
    const nDokumen = maxDokumen > 0 ? r.dokumen / maxDokumen : 0;
    const nFasilitas = maxFasilitas > 0 ? r.fasilitas / maxFasilitas : 0;
    const nRating = maxRating > 0 ? r.rating / maxRating : 0;
    const score =
      weight.bobotBidang * nBidang +
      weight.bobotJarak * nJarak +
      weight.bobotKuota * nKuota +
      weight.bobotKeahlian * nKeahlian +
      weight.bobotDokumen * nDokumen +
      weight.bobotFasilitas * nFasilitas +
      weight.bobotRating * nRating;
    return {
      lowonganId: r.id,
      score,
      raw: {
        bidang: r.bidang,
        jarak: r.jarakKm ?? 0,
        kuota: r.kuota,
        keahlian: r.keahlian,
        dokumen: r.dokumen,
        fasilitas: r.fasilitas,
        rating: r.rating,
      },
      normalized: {
        bidang: nBidang,
        jarak: nJarak,
        kuota: nKuota,
        keahlian: nKeahlian,
        dokumen: nDokumen,
        fasilitas: nFasilitas,
        rating: nRating,
      },
    };
  });
}

function pickWeight(
  weights: Array<SAWWeightValues & { jurusanId: string | null; isActive: boolean }>,
  jurusanId: string,
): SAWWeightValues {
  const per = weights.find((w) => w.jurusanId === jurusanId && w.isActive);
  if (per) return per;
  const def = weights.find((w) => w.jurusanId === null && w.isActive);
  if (def) return def;
  return DEFAULT_WEIGHT;
}

function pct(x: number): string {
  return (x * 100).toFixed(1).padStart(5) + "%";
}

function line() {
  return "─".repeat(72);
}

async function main() {
  const [siswaList, lowonganList, weights, reviewAgg] = await Promise.all([
    prisma.siswa.findMany({
      where: { user: { deletedAt: null } },
      select: {
        id: true,
        nama: true,
        nis: true,
        latitude: true,
        longitude: true,
        jarakMaksimal: true,
        bidangMinat: { select: { bidang: { select: { nama: true } } } },
        jurusanId: true,
        jurusan: { select: { nama: true } },
        keahlian: { select: { keahlianId: true, level: true } },
        dokumen: { select: { dokumenId: true, fileUrl: true } },
      },
    }),
    prisma.lowongan.findMany({
      where: { status: "OPEN" },
      select: {
        id: true,
        judul: true,
        bidang: { select: { bidang: { select: { id: true, nama: true } } } },
        kuotaTotal: true,
        terisiLaki: true,
        terisiPerempuan: true,
        uangSaku: true,
        makanSiang: true,
        transport: true,
        dudi: {
          select: {
            namaPerusahaan: true,
            latitude: true,
            longitude: true,
            ratingRataRata: true,
          },
        },
        keahlianDibutuhkan: {
          select: { keahlianId: true, levelMinimum: true },
        },
        dokumenDibutuhkan: {
          select: { dokumenId: true, wajib: true },
        },
      },
    }),
    prisma.sAWWeight.findMany({}),
    prisma.reviewDUDI.aggregate({ _count: { _all: true } }),
  ]);

  console.log(line());
  console.log(`Siswa aktif    : ${siswaList.length}`);
  console.log(`Lowongan OPEN  : ${lowonganList.length}`);
  console.log(`SAWWeight rows : ${weights.length}`);
  console.log(`Review DUDI    : ${reviewAgg._count._all}`);
  console.log(line());

  if (weights.length === 0) {
    console.log("[WARN] Tidak ada SAWWeight tersimpan → pakai DEFAULT_WEIGHT.");
    console.log(DEFAULT_WEIGHT);
  } else {
    console.log("SAWWeight records:");
    for (const w of weights) {
      console.log(
        `  [${w.isActive ? "ON " : "OFF"}] jurusan=${w.jurusanId ?? "GLOBAL"} ` +
          `bidang=${w.bobotBidang} jarak=${w.bobotJarak} ` +
          `kuota=${w.bobotKuota} keahlian=${w.bobotKeahlian} ` +
          `dok=${w.bobotDokumen} fas=${w.bobotFasilitas} rat=${w.bobotRating}`,
      );
    }
  }
  console.log(line());

  if (lowonganList.length === 0) {
    console.log("Tidak ada lowongan OPEN.");
    return;
  }

  console.log("LOWONGAN INPUT (raw untuk SAW):");
  for (const l of lowonganList) {
    const sisa = l.kuotaTotal - (l.terisiLaki + l.terisiPerempuan);
    console.log(
      `  • ${l.judul} @ ${l.dudi.namaPerusahaan}\n` +
        `      bidang=[${l.bidang.map((b) => b.bidang.nama).join(", ") || "-"}]\n` +
        `      koord=(${l.dudi.latitude}, ${l.dudi.longitude})  sisa=${sisa}/${l.kuotaTotal}\n` +
        `      keahlian_dibutuhkan=${l.keahlianDibutuhkan.length}  dokumen=${l.dokumenDibutuhkan.length} (${l.dokumenDibutuhkan.filter((d) => d.wajib).length} wajib)\n` +
        `      fasilitas: uangSaku=${l.uangSaku ?? 0} makan=${l.makanSiang} transport=${l.transport}\n` +
        `      rating DUDI=${l.dudi.ratingRataRata ?? "-"}`,
    );
  }
  console.log(line());

  if (siswaList.length === 0) {
    console.log("Tidak ada siswa.");
    return;
  }

  const lowonganInputs: SAWLowonganInput[] = lowonganList.map((l) => ({
    id: l.id,
    bidang: l.bidang.map((b) => b.bidang.nama),
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

  for (const s of siswaList) {
    console.log(`SISWA: ${s.nama} (${s.nis}) — ${s.jurusan.nama}`);
    const siswaBidangNama = s.bidangMinat.map((b) => b.bidang.nama);
    console.log(
      `  koord=(${s.latitude}, ${s.longitude})  jarakMaks=${s.jarakMaksimal ?? "-"} km  bidangMinat=[${siswaBidangNama.join(", ") || "-"}]`,
    );
    console.log(
      `  keahlian=${s.keahlian.length} item  dokumen=${s.dokumen.length} item`,
    );

    const ready =
      s.latitude !== null &&
      s.longitude !== null &&
      s.bidangMinat.length > 0;
    if (!ready) {
      console.log(
        `  [PROFIL BELUM LENGKAP] koord / bidangMinat belum di-set → page rekomendasi tidak akan tampil ranking.`,
      );
    }

    const w = pickWeight(weights, s.jurusanId);
    const scored = computeSAW(
      {
        latitude: s.latitude,
        longitude: s.longitude,
        jarakMaksimal: s.jarakMaksimal,
        bidangMinat: siswaBidangNama,
        keahlian: s.keahlian,
        dokumen: s.dokumen,
      },
      lowonganInputs,
      w,
    );
    scored.sort((a, b) => b.score - a.score);

    for (const r of scored) {
      const l = lowonganList.find((x) => x.id === r.lowonganId)!;
      console.log(
        `    ${pct(r.score)}  ${l.judul} @ ${l.dudi.namaPerusahaan}`,
      );
      console.log(
        `             raw: bidang=${r.raw.bidang.toFixed(2)} jarak=${r.raw.jarak.toFixed(2)}km kuota=${r.raw.kuota} keahlian=${r.raw.keahlian.toFixed(2)} dokumen=${r.raw.dokumen.toFixed(2)} fasilitas=${r.raw.fasilitas} rating=${r.raw.rating.toFixed(2)}`,
      );
      console.log(
        `             norm: bidang=${r.normalized.bidang.toFixed(2)} jarak=${r.normalized.jarak.toFixed(2)} kuota=${r.normalized.kuota.toFixed(2)} keahlian=${r.normalized.keahlian.toFixed(2)} dokumen=${r.normalized.dokumen.toFixed(2)} fasilitas=${r.normalized.fasilitas.toFixed(2)} rating=${r.normalized.rating.toFixed(2)}`,
      );
    }
    console.log("");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
