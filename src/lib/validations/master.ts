import { z } from "zod";

export const jurusanSchema = z.object({
  kode: z
    .string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, {
      message: "Kode hanya boleh huruf kapital, angka, -, _",
    }),
  nama: z.string().min(2).max(120),
  deskripsi: z.string().max(500).optional().or(z.literal("")),
});
export type JurusanInput = z.infer<typeof jurusanSchema>;

export const keahlianSchema = z.object({
  nama: z.string().min(2).max(120),
  kategori: z.string().max(60).optional().or(z.literal("")),
});
export type KeahlianInput = z.infer<typeof keahlianSchema>;

export const dokumenSchema = z.object({
  nama: z.string().min(2).max(120),
  deskripsi: z.string().max(500).optional().or(z.literal("")),
});
export type DokumenInput = z.infer<typeof dokumenSchema>;
