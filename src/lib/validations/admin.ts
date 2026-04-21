import { z } from "zod";

/** Profil admin yang bisa diedit user sendiri. */
export const adminProfilSchema = z.object({
  nama: z.string().min(2, { message: "Nama minimal 2 karakter" }).max(120),
  jabatan: z.string().max(120).optional().or(z.literal("")),
  nip: z.string().max(30).optional().or(z.literal("")),
  noHp: z.string().max(20).optional().or(z.literal("")),
  fotoUrl: z.string().min(1).optional().nullable(),
});
export type AdminProfilInput = z.infer<typeof adminProfilSchema>;
