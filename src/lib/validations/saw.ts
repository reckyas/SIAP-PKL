import { z } from "zod";

/**
 * Konfigurasi bobot SAW (Simple Additive Weighting).
 *
 * Admin set bobot per jurusan (atau global dengan jurusanId=null).
 * Total bobot 7 kriteria harus = 1.0 (toleransi 0.001).
 */
export const sawWeightSchema = z
  .object({
    nama: z.string().min(2, { message: "Nama minimal 2 karakter" }).max(120),
    jurusanId: z.string().optional().nullable(),
    isActive: z.boolean(),
    bobotBidang: z.number().gte(0).lte(1),
    bobotJarak: z.number().gte(0).lte(1),
    bobotKuota: z.number().gte(0).lte(1),
    bobotKeahlian: z.number().gte(0).lte(1),
    bobotDokumen: z.number().gte(0).lte(1),
    bobotFasilitas: z.number().gte(0).lte(1),
    bobotRating: z.number().gte(0).lte(1),
  })
  .refine(
    (d) => {
      const sum =
        d.bobotBidang +
        d.bobotJarak +
        d.bobotKuota +
        d.bobotKeahlian +
        d.bobotDokumen +
        d.bobotFasilitas +
        d.bobotRating;
      return Math.abs(sum - 1) < 0.001;
    },
    {
      message: "Total bobot harus sama dengan 1.0",
      path: ["bobotBidang"],
    },
  );

export type SAWWeightInput = z.infer<typeof sawWeightSchema>;
