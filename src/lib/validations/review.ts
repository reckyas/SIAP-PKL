import { z } from "zod";

/**
 * Review DUDI oleh siswa setelah PKL selesai.
 *
 * - Rating 1-5 bintang.
 * - Komentar opsional.
 * - Anonim: nama siswa tidak ditampilkan ke publik (tapi admin tetap tahu).
 */

export const reviewDudiSchema = z.object({
  dudiId: z.string().min(1),
  rating: z
    .number({ message: "Rating wajib diisi" })
    .int({ message: "Rating harus 1 sampai 5" })
    .min(1, { message: "Rating minimal 1" })
    .max(5, { message: "Rating maksimal 5" }),
  komentar: z
    .string()
    .max(2000, { message: "Komentar maksimal 2000 karakter" })
    .optional()
    .or(z.literal("")),
  anonim: z.boolean().default(false),
});
export type ReviewDudiInput = z.infer<typeof reviewDudiSchema>;
