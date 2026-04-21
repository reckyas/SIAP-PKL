import { z } from "zod";

export const IMPORT_COLUMNS = [
  "Email",
  "Nama",
  "NIP",
  "No HP",
  "Mata Pelajaran",
] as const;

export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const guruImportRowSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Email tidak valid" }),
  nama: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(100, { message: "Nama maksimal 100 karakter" }),
  nip: z
    .string()
    .trim()
    .min(4, { message: "NIP minimal 4 karakter" })
    .max(30, { message: "NIS/NIP maksimal 30 karakter" })
    .nullable(),
  noHp: z
    .string()
    .trim()
    .min(8, { message: "No HP minimal 8 karakter" })
    .max(20, { message: "No HP maksimal 20 karakter" }),
  mataPelajaran: z
    .string()
    .trim()
    .max(100, { message: "Mata Pelajaran maksimal 100 karakter" })
    .nullable(),
});

export type GuruImportRow = z.infer<typeof guruImportRowSchema>;

export function normalizeOptionalString(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}
