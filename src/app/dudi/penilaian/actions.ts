"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  hitungRataRata,
  penilaianSchema,
  type PenilaianInput,
} from "@/lib/validations/penilaian";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

async function requireDudi() {
  const s = await auth();
  if (!s?.user || s.user.role !== "DUDI") return null;
  const dudi = await prisma.dUDI.findUnique({
    where: { userId: s.user.id },
    select: {
      id: true,
      namaPerusahaan: true,
      user: { select: { status: true } },
    },
  });
  if (!dudi) return null;
  if (dudi.user.status !== "VERIFIED") return null;
  return { session: s, dudi };
}

/**
 * DUDI boleh menilai siswa yg:
 * - statusPKL = SELESAI
 * - pernah punya pendaftaran DITERIMA di lowongan milik DUDI ini.
 */
export async function upsertPenilaianDudiAction(
  input: PenilaianInput,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const parsed = penilaianSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const siswa = await prisma.siswa.findUnique({
    where: { id: d.siswaId },
    select: {
      id: true,
      userId: true,
      nama: true,
      statusPKL: true,
      pendaftaran: {
        where: {
          status: "DITERIMA",
          lowongan: { dudiId: ctx.dudi.id },
        },
        select: { id: true },
        take: 1,
      },
    },
  });
  if (!siswa) return { ok: false, error: "Siswa tidak ditemukan." };
  if (siswa.pendaftaran.length === 0) {
    return {
      ok: false,
      error: "Siswa ini tidak PKL di perusahaan Anda.",
    };
  }
  if (siswa.statusPKL !== "SELESAI") {
    return {
      ok: false,
      error: "Penilaian hanya bisa diberikan setelah PKL siswa selesai.",
    };
  }

  const rataRata = hitungRataRata(d);
  const catatan = d.catatan?.trim() || null;

  const existing = await prisma.penilaian.findFirst({
    where: { siswaId: siswa.id, dudiId: ctx.dudi.id },
    select: { id: true },
  });

  const penilaian = existing
    ? await prisma.penilaian.update({
        where: { id: existing.id },
        data: {
          nilaiKedisiplinan: d.nilaiKedisiplinan,
          nilaiKeterampilan: d.nilaiKeterampilan,
          nilaiKerjasama: d.nilaiKerjasama,
          nilaiInisiatif: d.nilaiInisiatif,
          nilaiTanggungJawab: d.nilaiTanggungJawab,
          nilaiRataRata: rataRata,
          catatan,
        },
        select: { id: true },
      })
    : await prisma.penilaian.create({
        data: {
          siswaId: siswa.id,
          dudiId: ctx.dudi.id,
          nilaiKedisiplinan: d.nilaiKedisiplinan,
          nilaiKeterampilan: d.nilaiKeterampilan,
          nilaiKerjasama: d.nilaiKerjasama,
          nilaiInisiatif: d.nilaiInisiatif,
          nilaiTanggungJawab: d.nilaiTanggungJawab,
          nilaiRataRata: rataRata,
          catatan,
        },
        select: { id: true },
      });

  await logAudit({
    userId: ctx.session.user.id,
    action: existing ? "PENILAIAN_UPDATE" : "PENILAIAN_CREATE",
    entityType: "Penilaian",
    entityId: penilaian.id,
    metadata: { siswaId: siswa.id, rataRata, role: "DUDI" },
  });

  if (!existing) {
    await notify({
      userId: siswa.userId,
      type: "PENILAIAN_MASUK",
      judul: "Nilai PKL dari DU/DI",
      pesan: `${ctx.dudi.namaPerusahaan} memberikan penilaian akhir PKL Anda.`,
      linkUrl: "/siswa/penilaian",
    });
  }

  revalidatePath("/dudi/penilaian");
  revalidatePath(`/dudi/penilaian/${siswa.id}`);
  revalidatePath("/siswa/penilaian");
  return { ok: true };
}
