import { z } from "zod";

// Header kolom template (urutan ini yang dipakai saat generate & parse template).
// Ubah di sini kalau mau tambah/rename kolom — generator & parser ikut.
export const IMPORT_COLUMNS = [
  "Email",
  "NIS",
  "Nama",
  "Jenis Kelamin",
  "Tanggal Lahir",
  "Alamat",
  "No HP",
  "Kode Jurusan",
  "Tingkat",
  "Nama Kelas",
  "Nama Guru",
  "Latitude",
  "Longitude",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

/**
 * Schema per-row hasil parse xlsx. Semua field masuk sebagai string dulu (atau
 * Date untuk kolom tanggal), lalu diproses normalisasi di action.
 */
export const siswaImportRowSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Email tidak valid" }),
  nis: z
    .string()
    .trim()
    .min(4, { message: "NIS minimal 4 karakter" })
    .max(30, { message: "NIS maksimal 30 karakter" }),
  nama: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(100, { message: "Nama maksimal 100 karakter" }),
  jenisKelamin: z.enum(["LAKI_LAKI", "PEREMPUAN"], {
    errorMap: () => ({ message: "Jenis Kelamin harus L atau P" }),
  }),
  tanggalLahir: z.date({
    errorMap: () => ({ message: "Tanggal Lahir tidak valid (format YYYY-MM-DD)" }),
  }),
  alamat: z
    .string()
    .trim()
    .min(4, { message: "Alamat minimal 4 karakter" })
    .max(255, { message: "Alamat maksimal 255 karakter" }),
  noHp: z
    .string()
    .trim()
    .min(8, { message: "No HP minimal 8 karakter" })
    .max(20, { message: "No HP maksimal 20 karakter" }),
  kodeJurusan: z.string().trim().min(1, { message: "Kode Jurusan wajib diisi" }),
  tingkat: z.enum(["X", "XI", "XII", "XIII"], {
    errorMap: () => ({ message: "Tingkat harus X / XI / XII / XIII" }),
  }),
  namaKelas: z.string().trim().min(1, { message: "Nama Kelas wajib diisi" }),
  namaGuru: z.string().trim().min(1).nullable(),
  latitude: z
    .number()
    .min(-90)
    .max(90)
    .nullable(),
  longitude: z
    .number()
    .min(-180)
    .max(180)
    .nullable(),
});

export type SiswaImportRow = z.infer<typeof siswaImportRowSchema>;

/** Normalisasi nilai jenis kelamin dari input user → enum Prisma. */
export function normalizeJenisKelamin(raw: unknown): string | undefined {
  if (raw == null) return undefined;
  const s = String(raw).trim().toUpperCase();
  if (s === "L" || s === "LAKI" || s === "LAKI-LAKI" || s === "LAKI_LAKI") {
    return "LAKI_LAKI";
  }
  if (s === "P" || s === "PEREMPUAN") return "PEREMPUAN";
  return s; // biar zod yang lempar error spesifik
}

/** Parse nilai tanggal: bisa Date (dari excel date cell) atau string. */
export function normalizeTanggal(raw: unknown): Date | undefined {
  if (raw == null || raw === "") return undefined;
  if (raw instanceof Date) {
    return isNaN(raw.getTime()) ? undefined : raw;
  }
  const s = String(raw).trim();
  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1]!, +iso[2]! - 1, +iso[3]!));
    return isNaN(d.getTime()) ? undefined : d;
  }
  // DD/MM/YYYY atau DD-MM-YYYY
  const local = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
  if (local) {
    const d = new Date(Date.UTC(+local[3]!, +local[2]! - 1, +local[1]!));
    return isNaN(d.getTime()) ? undefined : d;
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? undefined : fallback;
}

/** Parse angka: terima number, string, atau null/empty. */
export function normalizeNumber(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return isNaN(raw) ? null : raw;
  const s = String(raw).trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/** Parse string opsional. */
export function normalizeOptionalString(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}
