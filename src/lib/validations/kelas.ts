import { z } from "zod";

export const tingkatEnum = z.enum(["X", "XI", "XII", "XIII"], {
  errorMap: () => ({ message: "Tingkat wajib dipilih" }),
});
export type TingkatInput = z.infer<typeof tingkatEnum>;

export const kelasSchema = z.object({
  nama: z
    .string()
    .min(1, { message: "Nama kelas minimal 1 karakter" })
    .max(30, { message: "Nama kelas maksimal 30 karakter" }),
  tingkat: tingkatEnum,
  jurusanId: z.string().min(1, { message: "Jurusan wajib dipilih" }),
});
export type KelasInput = z.infer<typeof kelasSchema>;
