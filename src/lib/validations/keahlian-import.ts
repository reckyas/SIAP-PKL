import { z } from "zod";

export const IMPORT_COLUMNS = ["Nama", "Kategori"] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const keahlianImportRowSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(120, { message: "Nama maksimal 120 karakter" }),
  kategori: z
    .string()
    .trim()
    .max(60, { message: "Kategori maksimal 60 karakter" })
    .nullable(),
});

export type KeahlianImportRow = z.infer<typeof keahlianImportRowSchema>;

export function normalizeOptionalString(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}
