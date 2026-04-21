"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  reviewLogbookSchema,
  type ReviewLogbookInput,
} from "@/lib/validations/logbook";

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

async function requireGuru() {
  const s = await auth();
  if (!s?.user || s.user.role !== "GURU_PEMBIMBING") return null;
  const guru = await prisma.guru.findUnique({
    where: { userId: s.user.id },
    select: { id: true, nama: true },
  });
  if (!guru) return null;
  return { session: s, guru };
}

export async function reviewLogbookAction(
  input: ReviewLogbookInput,
): Promise<MutationResult> {
  const ctx = await requireGuru();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const parsed = reviewLogbookSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const catatan = d.catatan?.trim() || null;

  const current = await prisma.logbook.findUnique({
    where: { id: d.logbookId },
    select: {
      id: true,
      status: true,
      tanggal: true,
      siswa: {
        select: {
          id: true,
          nama: true,
          userId: true,
          guruId: true,
        },
      },
    },
  });
  if (!current) return { ok: false, error: "Logbook tidak ditemukan." };
  if (current.siswa.guruId !== ctx.guru.id) {
    return { ok: false, error: "Siswa ini bukan bimbingan Anda." };
  }
  if (current.status !== "SUBMITTED") {
    return {
      ok: false,
      error: "Hanya logbook yang dikirim (SUBMITTED) yang bisa direview.",
    };
  }
  if (!d.approve && !catatan) {
    return {
      ok: false,
      error: "Catatan wajib diisi saat mengembalikan untuk revisi.",
    };
  }

  await prisma.logbook.update({
    where: { id: current.id },
    data: {
      status: d.approve ? "REVIEWED" : "REVISED",
      reviewedAt: new Date(),
      catatanReview: catatan,
      reviewerRole: "GURU_PEMBIMBING",
    },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: d.approve ? "LOGBOOK_REVIEW_APPROVE" : "LOGBOOK_REVIEW_REVISE",
    entityType: "Logbook",
    entityId: current.id,
    metadata: { catatan },
  });

  await notify({
    userId: current.siswa.userId,
    type: "LOGBOOK_REVIEW",
    judul: d.approve
      ? "Logbook disetujui guru"
      : "Logbook perlu direvisi",
    pesan: `Logbook tanggal ${current.tanggal.toLocaleDateString("id-ID")} ${d.approve ? "disetujui" : "diminta direvisi"} oleh ${ctx.guru.nama}.`,
    linkUrl: `/siswa/logbook/${current.id}`,
  });

  revalidatePath("/guru/logbook");
  revalidatePath(`/guru/logbook/${current.id}`);
  return { ok: true };
}
