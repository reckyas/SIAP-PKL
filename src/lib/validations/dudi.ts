import { z } from "zod";

/**
 * Admin tambah DUDI langsung (sekolah sudah punya data perusahaan mitra).
 *
 * - Akun dibuat status = VERIFIED (tidak lewat antrian verifikasi).
 * - Password awal opsional; kalau kosong pakai default di action layer.
 * - mustChangePassword = true supaya DUDI ganti password saat login pertama.
 */
export const createDudiByAdminSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }).max(120),
  passwordAwal: z
    .string()
    .max(72)
    .optional()
    .or(z.literal("")),

  namaPerusahaan: z
    .string()
    .min(2, { message: "Nama perusahaan minimal 2 karakter" })
    .max(120),
  alamat: z.string().min(5).max(500),
  latitude: z
    .number({ invalid_type_error: "Latitude harus angka" })
    .gte(-90)
    .lte(90),
  longitude: z
    .number({ invalid_type_error: "Longitude harus angka" })
    .gte(-180)
    .lte(180),

  namaPIC: z.string().min(2).max(120),
  noHpPIC: z.string().min(8).max(20),

  websiteUrl: z
    .string()
    .max(200)
    .refine((v) => !v || /^https?:\/\//i.test(v), {
      message: "URL harus diawali http:// atau https://",
    })
    .optional()
    .or(z.literal("")),

  bidangUsaha: z
    .array(z.string().min(1))
    .min(1, { message: "Minimal 1 bidang usaha" })
    .max(10),
});
export type CreateDudiByAdminInput = z.infer<typeof createDudiByAdminSchema>;

/**
 * Profil DUDI yang bisa diedit user sendiri.
 *
 * Email login dan status verifikasi tidak bisa diubah dari sini.
 */
export const dudiProfilSchema = z.object({
  namaPerusahaan: z
    .string()
    .min(2, { message: "Nama perusahaan minimal 2 karakter" })
    .max(120),
  deskripsi: z.string().max(2000).optional().or(z.literal("")),
  logoUrl: z.string().min(1).optional().nullable(),
  websiteUrl: z
    .string()
    .max(200)
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      { message: "URL harus diawali http:// atau https://" },
    )
    .optional()
    .or(z.literal("")),

  alamat: z.string().min(5).max(500),
  latitude: z
    .number({ invalid_type_error: "Latitude harus angka" })
    .gte(-90)
    .lte(90),
  longitude: z
    .number({ invalid_type_error: "Longitude harus angka" })
    .gte(-180)
    .lte(180),

  namaPIC: z.string().min(2).max(120),
  jabatanPIC: z.string().max(120).optional().or(z.literal("")),
  noHpPIC: z.string().min(8).max(20),
  emailPIC: z
    .string()
    .email({ message: "Email PIC tidak valid" })
    .max(120)
    .optional()
    .or(z.literal("")),

  bidangUsaha: z
    .array(z.string().min(1))
    .min(1, { message: "Minimal 1 bidang usaha" })
    .max(10),
  fotoUrls: z.array(z.string().min(1)).max(10),
});
export type DudiProfilInput = z.infer<typeof dudiProfilSchema>;
