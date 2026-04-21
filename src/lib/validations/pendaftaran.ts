import { z } from "zod";

/**
 * Schema input untuk alur pendaftaran PKL (3 role terpisah).
 *
 * - daftarLowonganSchema: siswa daftar ke lowongan (motivasi opsional).
 * - guruDecisionSchema: guru approve/reject pendaftaran siswa bimbingan.
 * - dudiDecisionSchema: DUDI terima/tolak pendaftaran.
 */

export const daftarLowonganSchema = z.object({
  lowonganId: z.string().min(1),
  motivasi: z
    .string()
    .max(2000, { message: "Motivasi maksimal 2000 karakter" })
    .optional()
    .or(z.literal("")),
});
export type DaftarLowonganInput = z.infer<typeof daftarLowonganSchema>;

export const guruDecisionSchema = z.object({
  pendaftaranId: z.string().min(1),
  approve: z.boolean(),
  catatan: z
    .string()
    .max(1000, { message: "Catatan maksimal 1000 karakter" })
    .optional()
    .or(z.literal("")),
});
export type GuruDecisionInput = z.infer<typeof guruDecisionSchema>;

export const dudiDecisionSchema = z.object({
  pendaftaranId: z.string().min(1),
  terima: z.boolean(),
  catatan: z
    .string()
    .max(1000, { message: "Catatan maksimal 1000 karakter" })
    .optional()
    .or(z.literal("")),
});
export type DudiDecisionInput = z.infer<typeof dudiDecisionSchema>;
