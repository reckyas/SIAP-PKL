import { z } from "zod";

/**
 * Schema Lowongan PKL.
 *
 * Dipakai oleh DUDI saat buat/edit lowongan (form sama, mode berbeda).
 * Field `status` tidak masuk sini — publish/close dikontrol lewat action
 * terpisah supaya ada validasi state-transition yang bersih.
 */
export const lowonganSchema = z
  .object({
    judul: z.string().min(3, { message: "Judul minimal 3 karakter" }).max(150),
    deskripsi: z
      .string()
      .min(10, { message: "Deskripsi minimal 10 karakter" })
      .max(5000),
    bidang: z
      .array(z.string().min(1))
      .min(1, { message: "Minimal 1 bidang" })
      .max(10),
    jurusanIds: z
      .array(z.string().min(1))
      .min(1, { message: "Minimal 1 jurusan target" })
      .max(20),

    kuotaTotal: z
      .number({ invalid_type_error: "Kuota total harus angka" })
      .int()
      .min(1, { message: "Kuota total minimal 1" })
      .max(500),
    kuotaLaki: z
      .number({ invalid_type_error: "Kuota laki-laki harus angka" })
      .int()
      .min(0)
      .max(500),
    kuotaPerempuan: z
      .number({ invalid_type_error: "Kuota perempuan harus angka" })
      .int()
      .min(0)
      .max(500),

    tanggalMulai: z.coerce.date({
      errorMap: () => ({ message: "Tanggal mulai tidak valid" }),
    }),
    tanggalSelesai: z.coerce.date({
      errorMap: () => ({ message: "Tanggal selesai tidak valid" }),
    }),

    keahlianDibutuhkan: z
      .array(
        z.object({
          keahlianId: z.string().min(1),
          levelMinimum: z.number().int().gte(1).lte(5),
        }),
      )
      .max(20),
    dokumenDibutuhkan: z
      .array(
        z.object({
          dokumenId: z.string().min(1),
          wajib: z.boolean(),
        }),
      )
      .max(20),
    nilaiMinimum: z
      .number({ invalid_type_error: "Nilai minimum harus angka" })
      .gte(0)
      .lte(100)
      .optional()
      .nullable(),

    uangSaku: z
      .number({ invalid_type_error: "Uang saku harus angka" })
      .int()
      .gte(0)
      .optional()
      .nullable(),
    makanSiang: z.boolean(),
    transport: z.boolean(),
    fasilitasLain: z.string().max(500).optional().or(z.literal("")),

    jamKerja: z.string().max(100).optional().or(z.literal("")),
    hariKerja: z.string().max(100).optional().or(z.literal("")),
    dressCode: z.string().max(100).optional().or(z.literal("")),
    catatanKhusus: z.string().max(2000).optional().or(z.literal("")),
  })
  .refine((d) => d.kuotaLaki + d.kuotaPerempuan === d.kuotaTotal, {
    message: "Kuota total harus sama dengan kuota laki + perempuan",
    path: ["kuotaTotal"],
  })
  .refine((d) => d.tanggalSelesai > d.tanggalMulai, {
    message: "Tanggal selesai harus setelah tanggal mulai",
    path: ["tanggalSelesai"],
  });

export type LowonganInput = z.infer<typeof lowonganSchema>;
