"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  siswaProfilSchema,
  type SiswaProfilInput,
} from "@/lib/validations/siswa";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodFieldErrors(
  err: import("zod").ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Update profil siswa oleh siswa sendiri.
 *
 * Field yang dikelola admin (NIS, email, jurusan, kelas, guru) tidak
 * disentuh di sini. Keahlian & dokumen disinkron lewat deleteMany + createMany
 * dalam satu transaksi supaya daftar selalu match dengan input.
 */
export async function updateSiswaProfilAction(
  input: SiswaProfilInput,
): Promise<MutationResult> {
  const s = await auth();
  if (!s?.user || s.user.role !== "SISWA") {
    return { ok: false, error: "Tidak berwenang." };
  }

  const parsed = siswaProfilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.siswa.findUnique({
    where: { userId: s.user.id },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "Profil siswa tidak ditemukan." };

  // Cegah duplikat keahlian/dokumen/bidang yang akan melanggar unique composite key.
  const keahlianIds = new Set<string>();
  const dedupedKeahlian = d.keahlian.filter((k) => {
    if (keahlianIds.has(k.keahlianId)) return false;
    keahlianIds.add(k.keahlianId);
    return true;
  });
  const dokumenIds = new Set<string>();
  const dedupedDokumen = d.dokumen.filter((x) => {
    if (dokumenIds.has(x.dokumenId)) return false;
    dokumenIds.add(x.dokumenId);
    return true;
  });
  const dedupedBidang = Array.from(new Set(d.bidangMinat));

  await prisma.$transaction([
    prisma.siswa.update({
      where: { id: current.id },
      data: {
        nama: d.nama,
        jenisKelamin: d.jenisKelamin,
        tanggalLahir: d.tanggalLahir,
        alamat: d.alamat,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        noHp: d.noHp,
        fotoUrl: d.fotoUrl || null,
        jarakMaksimal: d.jarakMaksimal ?? null,
        bersediaKos: d.bersediaKos,
      },
    }),
    prisma.siswaKeahlian.deleteMany({ where: { siswaId: current.id } }),
    prisma.siswaKeahlian.createMany({
      data: dedupedKeahlian.map((k) => ({
        siswaId: current.id,
        keahlianId: k.keahlianId,
        level: k.level,
      })),
    }),
    prisma.siswaDokumen.deleteMany({ where: { siswaId: current.id } }),
    prisma.siswaDokumen.createMany({
      data: dedupedDokumen.map((x) => ({
        siswaId: current.id,
        dokumenId: x.dokumenId,
        fileUrl: x.fileUrl,
        nomorDok: x.nomorDok?.trim() || null,
      })),
    }),
    prisma.siswaBidangMinat.deleteMany({ where: { siswaId: current.id } }),
    prisma.siswaBidangMinat.createMany({
      data: dedupedBidang.map((bid) => ({
        siswaId: current.id,
        bidangId: bid,
      })),
    }),
  ]);

  await logAudit({
    userId: s.user.id,
    action: "UPDATE_PROFIL_SISWA",
    entityType: "Siswa",
    entityId: current.id,
  });

  revalidatePath("/siswa/profil");
  revalidatePath("/siswa");
  return { ok: true };
}
