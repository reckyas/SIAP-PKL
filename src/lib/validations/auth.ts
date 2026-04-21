import { z } from "zod";

/** Login */
export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Register DU/DI (self-service publik).
 *
 * Untuk siswa & guru: dibuat oleh admin lewat /admin/siswa dan /admin/guru.
 * Tidak ada self-register untuk role selain DUDI.
 */
export const registerDudiSchema = z
  .object({
    email: z.string().email({ message: "Email tidak valid" }),
    password: z
      .string()
      .min(8, { message: "Password minimal 8 karakter" })
      .max(72, { message: "Password maksimal 72 karakter" }),
    confirmPassword: z.string(),
    namaPerusahaan: z
      .string()
      .min(2, { message: "Nama perusahaan minimal 2 karakter" })
      .max(120),
    alamat: z.string().min(5, { message: "Alamat minimal 5 karakter" }).max(500),
    // Koordinat dari map picker — wajib di-set user, default di UI ke pusat Ponorogo.
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
    bidangUsaha: z
      .array(z.string().min(1))
      .min(1, { message: "Pilih minimal 1 bidang usaha" })
      .max(10),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok",
  });
export type RegisterDudiInput = z.infer<typeof registerDudiSchema>;

/** Ganti password (force first-login atau dari profil). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Password lama wajib diisi" }),
    newPassword: z
      .string()
      .min(8, { message: "Password baru minimal 8 karakter" })
      .max(72),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi password tidak cocok",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Password baru harus berbeda dari password lama",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
