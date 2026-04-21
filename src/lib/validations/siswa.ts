import { z } from "zod";

/**
 * Schema dasar siswa — dipakai di create (admin) dan profil edit (siswa).
 *
 * Di admin create:
 *   - email wajib (dipakai untuk akun user).
 *   - jurusanId wajib.
 *   - password otomatis = NIS kalau tidak diisi, mustChangePassword=true.
 *
 * Di siswa edit profil:
 *   - email read-only (tidak bisa diganti).
 *   - sisa field bisa diedit kecuali NIS (read-only) + jurusanId (read-only).
 */

export const genderEnum = z.enum(["LAKI_LAKI", "PEREMPUAN"], {
  errorMap: () => ({ message: "Jenis kelamin wajib dipilih" }),
});

const nisRegex = /^[0-9]{4,20}$/;

export const createSiswaSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }).max(120),
  // Password awal optional — kalau kosong kita isi dengan NIS.
  passwordAwal: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .max(72)
    .optional()
    .or(z.literal("")),
  nis: z
    .string()
    .regex(nisRegex, { message: "NIS harus angka 4-20 digit" }),
  nama: z.string().min(2, { message: "Nama minimal 2 karakter" }).max(120),
  jenisKelamin: genderEnum,
  tanggalLahir: z.coerce.date({
    errorMap: () => ({ message: "Tanggal lahir tidak valid" }),
  }),
  alamat: z.string().min(5).max(500),
  latitude: z
    .number({ invalid_type_error: "Latitude harus angka" })
    .gte(-90)
    .lte(90)
    .optional()
    .nullable(),
  longitude: z
    .number({ invalid_type_error: "Longitude harus angka" })
    .gte(-180)
    .lte(180)
    .optional()
    .nullable(),
  noHp: z.string().min(8).max(20),
  kelasId: z.string().min(1, { message: "Kelas wajib dipilih" }),
  jurusanId: z.string().min(1, { message: "Jurusan wajib dipilih" }),
  guruId: z.string().optional().nullable(),
});
export type CreateSiswaInput = z.infer<typeof createSiswaSchema>;

/** Edit oleh admin — field sama, kecuali password tidak dipaksa. */
export const editSiswaSchema = createSiswaSchema.omit({ passwordAwal: true });
export type EditSiswaInput = z.infer<typeof editSiswaSchema>;

/**
 * Profil siswa lengkap — yang bisa diedit user sendiri.
 * NIS, email, jurusan, kelas, guru dikunci (hanya admin yang ubah).
 */
export const siswaProfilSchema = z.object({
  nama: z.string().min(2).max(120),
  jenisKelamin: genderEnum,
  tanggalLahir: z.coerce.date(),
  alamat: z.string().min(5).max(500),
  latitude: z.number().gte(-90).lte(90).optional().nullable(),
  longitude: z.number().gte(-180).lte(180).optional().nullable(),
  noHp: z.string().min(8).max(20),
  fotoUrl: z.string().min(1).optional().nullable(),
  jarakMaksimal: z.number().gte(0).lte(500).optional().nullable(),
  bersediaKos: z.boolean(),
  bidangMinat: z.array(z.string().min(1)).max(10),
  // Keahlian: id keahlian → level 1-5
  keahlian: z
    .array(
      z.object({
        keahlianId: z.string().min(1),
        level: z.number().int().gte(1).lte(5),
      }),
    )
    .max(20),
  // Dokumen: dokumenId (master) → fileUrl + nomor dokumen (optional)
  dokumen: z
    .array(
      z.object({
        dokumenId: z.string().min(1),
        fileUrl: z.string().min(1),
        nomorDok: z.string().max(50).optional().nullable(),
      }),
    )
    .max(20),
});
export type SiswaProfilInput = z.infer<typeof siswaProfilSchema>;
