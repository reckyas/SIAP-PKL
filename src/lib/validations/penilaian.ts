import { z } from "zod";

/**
 * Schema penilaian akhir PKL.
 *
 * - 5 aspek nilai (0-100) + catatan opsional.
 * - Rata-rata dihitung server-side, bukan diambil dari input.
 * - Satu siswa dapat 1 penilaian dari guru pembimbing + 1 dari DUDI
 *   (uniqueness per assessor di-enforce di application layer, bukan DB).
 */

const nilaiField = z
  .number({ message: "Nilai wajib diisi" })
  .int({ message: "Nilai harus bilangan bulat" })
  .min(0, { message: "Nilai minimal 0" })
  .max(100, { message: "Nilai maksimal 100" });

export const penilaianSchema = z.object({
  siswaId: z.string().min(1),
  nilaiKedisiplinan: nilaiField,
  nilaiKeterampilan: nilaiField,
  nilaiKerjasama: nilaiField,
  nilaiInisiatif: nilaiField,
  nilaiTanggungJawab: nilaiField,
  catatan: z
    .string()
    .max(2000, { message: "Catatan maksimal 2000 karakter" })
    .optional()
    .or(z.literal("")),
});
export type PenilaianInput = z.infer<typeof penilaianSchema>;

/**
 * Hitung rata-rata 5 aspek. Dipakai di action — jangan biarkan client
 * mengirim angka rata-rata (bisa dimanipulasi).
 */
export function hitungRataRata(n: {
  nilaiKedisiplinan: number;
  nilaiKeterampilan: number;
  nilaiKerjasama: number;
  nilaiInisiatif: number;
  nilaiTanggungJawab: number;
}): number {
  const total =
    n.nilaiKedisiplinan +
    n.nilaiKeterampilan +
    n.nilaiKerjasama +
    n.nilaiInisiatif +
    n.nilaiTanggungJawab;
  return Number((total / 5).toFixed(2));
}

export const ASPEK_PENILAIAN = [
  { key: "nilaiKedisiplinan", label: "Kedisiplinan" },
  { key: "nilaiKeterampilan", label: "Keterampilan" },
  { key: "nilaiKerjasama", label: "Kerjasama" },
  { key: "nilaiInisiatif", label: "Inisiatif" },
  { key: "nilaiTanggungJawab", label: "Tanggung jawab" },
] as const satisfies ReadonlyArray<{
  key: keyof Omit<PenilaianInput, "siswaId" | "catatan">;
  label: string;
}>;
