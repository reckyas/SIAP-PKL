import "server-only";

/**
 * SAW (Simple Additive Weighting) untuk merekomendasikan lowongan PKL.
 *
 * Alur:
 *   1. Hard filter: buang lowongan yang jurusan target-nya tidak memuat
 *      jurusan siswa. Kriteria utama → bukan scoring, tapi filter tegas.
 *   2. Hitung skor mentah tiap kriteria per alternatif (lowongan) yang lolos.
 *   3. Normalisasi ke [0,1] → benefit: x/max, cost: min/x.
 *   4. Total skor = Σ (bobot_i × skor_normalisasi_i).
 *
 * 7 kriteria scoring (plus hard filter jurusan):
 *   - Keahlian   (benefit) : coverage keahlian siswa vs yang dibutuhkan  [primer]
 *   - Jarak      (cost)    : haversine km siswa-DUDI
 *   - Bidang     (benefit) : match bidangMinat siswa vs bidang lowongan
 *   - Dokumen    (benefit) : coverage dokumen wajib yg sudah diupload siswa
 *   - Rating     (benefit) : rating rata-rata DUDI dari review siswa
 *   - Kuota      (benefit) : sisa kuota lowongan
 *   - Fasilitas  (benefit) : uang saku / makan / transport
 */

export interface SAWSiswaInput {
  jurusanId: string;
  latitude: number | null;
  longitude: number | null;
  jarakMaksimal: number | null; // km
  bidangMinat: string[];
  keahlian: { keahlianId: string; level: number }[];
  dokumen: { dokumenId: string; fileUrl: string | null }[];
}

export interface SAWLowonganInput {
  id: string;
  bidang: string[];
  jurusanIds: string[];
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
  dudiRating: number | null; // 0..5
}

export interface SAWWeightValues {
  bobotBidang: number;
  bobotJarak: number;
  bobotKuota: number;
  bobotKeahlian: number;
  bobotDokumen: number;
  bobotFasilitas: number;
  bobotRating: number;
}

export interface SAWBreakdown {
  bidang: number;
  jarak: number;
  kuota: number;
  keahlian: number;
  dokumen: number;
  fasilitas: number;
  rating: number;
}

export interface SAWScored {
  lowonganId: string;
  score: number;
  raw: SAWBreakdown;
  normalized: SAWBreakdown;
}

// Jurusan dipakai sebagai hard filter (bukan scoring), jadi tidak ada
// bobotJurusan. Keahlian jadi primer karena paling menentukan cocok/tidak.
export const DEFAULT_WEIGHT: SAWWeightValues = {
  bobotKeahlian: 0.35,
  bobotJarak: 0.2,
  bobotBidang: 0.15,
  bobotDokumen: 0.1,
  bobotRating: 0.1,
  bobotKuota: 0.05,
  bobotFasilitas: 0.05,
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

function rawBidang(
  siswaBidang: string[],
  lowonganBidang: string[],
): number {
  if (lowonganBidang.length === 0) return 0;
  const set = new Set(lowonganBidang);
  const matched = siswaBidang.filter((b) => set.has(b)).length;
  return matched / lowonganBidang.length;
}

function rawJarakKm(
  siswa: { lat: number | null; lng: number | null },
  lowongan: { lat: number; lng: number },
): number | null {
  if (siswa.lat === null || siswa.lng === null) return null;
  return haversineKm(
    { lat: siswa.lat, lng: siswa.lng },
    { lat: lowongan.lat, lng: lowongan.lng },
  );
}

function rawKuotaSisa(l: SAWLowonganInput): number {
  return Math.max(0, l.kuotaTotal - (l.terisiLaki + l.terisiPerempuan));
}

function rawKeahlian(
  siswa: { keahlianId: string; level: number }[],
  needed: { keahlianId: string; levelMinimum: number }[],
): number {
  // Lowongan yang tidak isi keahlian → skor netral (0.5), bukan sempurna.
  // Sebelumnya return 1 bikin lowongan kosong selalu unggul di kriteria ini.
  if (needed.length === 0) return 0.5;
  const map = new Map(siswa.map((k) => [k.keahlianId, k.level]));
  let sum = 0;
  for (const n of needed) {
    const lvl = map.get(n.keahlianId);
    if (lvl === undefined) continue;
    sum += Math.min(lvl, n.levelMinimum) / n.levelMinimum;
  }
  return sum / needed.length;
}

function rawDokumen(
  siswaDocs: { dokumenId: string; fileUrl: string | null }[],
  needed: { dokumenId: string; wajib: boolean }[],
): number {
  const wajib = needed.filter((d) => d.wajib);
  // Sama alasan dengan rawKeahlian: netral, bukan sempurna.
  if (wajib.length === 0) return 0.5;
  const siswaSet = new Set(
    siswaDocs
      .filter((d) => d.fileUrl && d.fileUrl.length > 0)
      .map((d) => d.dokumenId),
  );
  const covered = wajib.filter((d) => siswaSet.has(d.dokumenId)).length;
  return covered / wajib.length;
}

function rawFasilitas(l: SAWLowonganInput): number {
  let c = 0;
  if (l.uangSaku && l.uangSaku > 0) c++;
  if (l.makanSiang) c++;
  if (l.transport) c++;
  return c; // 0..3
}

export function computeSAW(
  siswa: SAWSiswaInput,
  lowongan: SAWLowonganInput[],
  weight: SAWWeightValues,
): SAWScored[] {
  if (lowongan.length === 0) return [];

  // Hard filter: lowongan yang tidak menyertakan jurusan siswa di
  // jurusanTarget langsung dibuang. Ini kriteria utama (bukan scoring).
  const eligible = lowongan.filter((l) => l.jurusanIds.includes(siswa.jurusanId));
  if (eligible.length === 0) return [];

  const raw = eligible.map((l) => ({
    id: l.id,
    bidang: rawBidang(siswa.bidangMinat, l.bidang),
    jarakKm: rawJarakKm(
      { lat: siswa.latitude, lng: siswa.longitude },
      { lat: l.latitude, lng: l.longitude },
    ),
    kuota: rawKuotaSisa(l),
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

    // Cost: min/x. Kalau siswa belum set koordinat, skor netral 0.5.
    let nJarak: number;
    if (r.jarakKm === null) {
      nJarak = 0.5;
    } else if (r.jarakKm <= 0) {
      nJarak = 1;
    } else if (minJarak <= 0) {
      nJarak = 0;
    } else {
      nJarak = minJarak / r.jarakKm;
    }
    // Penalti kalau lebih jauh dari jarakMaksimal yang siswa tetapkan.
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

export interface SAWWeightRecord extends SAWWeightValues {
  id: string;
  jurusanId: string | null;
  isActive: boolean;
}

/**
 * Pilih bobot SAW yang berlaku untuk siswa di jurusan tertentu:
 *   1. Bobot aktif di jurusan itu.
 *   2. Fallback bobot aktif global (jurusanId=null).
 *   3. Fallback default hardcoded.
 */
export function pickWeight(
  weights: SAWWeightRecord[],
  jurusanId: string,
): SAWWeightValues {
  const perJurusan = weights.find(
    (w) => w.jurusanId === jurusanId && w.isActive,
  );
  if (perJurusan) return perJurusan;
  const def = weights.find((w) => w.jurusanId === null && w.isActive);
  if (def) return def;
  return DEFAULT_WEIGHT;
}
