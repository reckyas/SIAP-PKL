import { z } from "zod";

/**
 * Schema input untuk alur Logbook Harian PKL.
 *
 * - logbookEntrySchema: siswa create/update entry (draft/revisi).
 * - reviewLogbookSchema: guru tandai logbook SUBMITTED → REVIEWED/REVISED.
 */

const dateSchema = z.preprocess(
  (v) => {
    if (v instanceof Date) return v;
    if (typeof v === "string" && v.length > 0) return new Date(v);
    return v;
  },
  z.date({ message: "Tanggal tidak valid" }),
);

// Lampiran: user paste 1 URL per baris di textarea; kita parse di action.
// Di sini field-nya sudah berupa array string yg divalidasi URL.
const lampiranSchema = z
  .array(z.string().url({ message: "Lampiran harus berupa URL valid" }))
  .max(10, { message: "Maksimal 10 lampiran" })
  .default([]);

export const logbookEntrySchema = z.object({
  id: z.string().optional(),
  tanggal: dateSchema,
  kegiatan: z
    .string()
    .min(10, { message: "Kegiatan minimal 10 karakter" })
    .max(5000, { message: "Kegiatan maksimal 5000 karakter" }),
  kendala: z
    .string()
    .max(2000, { message: "Kendala maksimal 2000 karakter" })
    .optional()
    .or(z.literal("")),
  lampiranUrls: lampiranSchema,
});
export type LogbookEntryInput = z.infer<typeof logbookEntrySchema>;

export const reviewLogbookSchema = z.object({
  logbookId: z.string().min(1),
  approve: z.boolean(), // true => REVIEWED, false => REVISED
  catatan: z
    .string()
    .max(2000, { message: "Catatan maksimal 2000 karakter" })
    .optional()
    .or(z.literal("")),
});
export type ReviewLogbookInput = z.infer<typeof reviewLogbookSchema>;
