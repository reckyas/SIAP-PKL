"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  reviewDudiSchema,
  type ReviewDudiInput,
} from "@/lib/validations/review";

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

async function requireSiswa() {
  const s = await auth();
  if (!s?.user || s.user.role !== "SISWA") return null;
  const siswa = await prisma.siswa.findUnique({
    where: { userId: s.user.id },
    select: { id: true, nama: true, statusPKL: true },
  });
  if (!siswa) return null;
  return { session: s, siswa };
}

/**
 * Siswa submit review DUDI.
 * - Harus pernah DITERIMA di lowongan DUDI tsb.
 * - statusPKL harus SELESAI (agar review authentic).
 * - Upsert via @@unique([siswaId, dudiId]) — boleh edit review sendiri.
 * - Setelah upsert, rekompute ratingRataRata + jumlahReview DUDI.
 */
export async function upsertReviewDudiAction(
  input: ReviewDudiInput,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const parsed = reviewDudiSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  if (ctx.siswa.statusPKL !== "SELESAI") {
    return {
      ok: false,
      error: "Review hanya bisa diberikan setelah PKL Anda selesai.",
    };
  }

  const pernahDiterima = await prisma.pendaftaran.findFirst({
    where: {
      siswaId: ctx.siswa.id,
      status: "DITERIMA",
      lowongan: { dudiId: d.dudiId },
    },
    select: { id: true },
  });
  if (!pernahDiterima) {
    return {
      ok: false,
      error: "Anda tidak PKL di perusahaan ini.",
    };
  }

  const komentar = d.komentar?.trim() || null;

  try {
    const { review, isNew } = await prisma.$transaction(async (tx) => {
      const existing = await tx.reviewDUDI.findUnique({
        where: {
          siswaId_dudiId: { siswaId: ctx.siswa.id, dudiId: d.dudiId },
        },
        select: { id: true },
      });

      const review = await tx.reviewDUDI.upsert({
        where: {
          siswaId_dudiId: { siswaId: ctx.siswa.id, dudiId: d.dudiId },
        },
        update: {
          rating: d.rating,
          komentar,
          anonim: d.anonim,
        },
        create: {
          siswaId: ctx.siswa.id,
          dudiId: d.dudiId,
          rating: d.rating,
          komentar,
          anonim: d.anonim,
        },
        select: { id: true },
      });

      // Rekompute agregat DUDI.
      const agg = await tx.reviewDUDI.aggregate({
        where: { dudiId: d.dudiId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.dUDI.update({
        where: { id: d.dudiId },
        data: {
          ratingRataRata: agg._avg.rating ?? null,
          jumlahReview: agg._count._all,
        },
      });

      return { review, isNew: !existing };
    });

    await logAudit({
      userId: ctx.session.user.id,
      action: isNew ? "REVIEW_DUDI_CREATE" : "REVIEW_DUDI_UPDATE",
      entityType: "ReviewDUDI",
      entityId: review.id,
      metadata: { dudiId: d.dudiId, rating: d.rating, anonim: d.anonim },
    });

    revalidatePath("/siswa/review");
    revalidatePath(`/siswa/review/${d.dudiId}`);
    revalidatePath("/dudi/review");
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan review.";
    return { ok: false, error: msg };
  }
}
