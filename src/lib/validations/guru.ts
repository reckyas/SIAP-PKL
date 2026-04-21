import { z } from "zod";

export const createGuruSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }).max(120),
  passwordAwal: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .max(72)
    .optional()
    .or(z.literal("")),
  nama: z.string().min(2).max(120),
  nip: z.string().max(30).optional().or(z.literal("")),
  noHp: z.string().min(8).max(20),
  mataPelajaran: z.string().max(120).optional().or(z.literal("")),
});
export type CreateGuruInput = z.infer<typeof createGuruSchema>;

export const editGuruSchema = createGuruSchema.omit({ passwordAwal: true });
export type EditGuruInput = z.infer<typeof editGuruSchema>;

/** Profil guru yang bisa diedit user sendiri. */
export const guruProfilSchema = z.object({
  nama: z.string().min(2).max(120),
  nip: z.string().max(30).optional().or(z.literal("")),
  noHp: z.string().min(8).max(20),
  mataPelajaran: z.string().max(120).optional().or(z.literal("")),
  fotoUrl: z.string().min(1).optional().nullable(),
});
export type GuruProfilInput = z.infer<typeof guruProfilSchema>;
