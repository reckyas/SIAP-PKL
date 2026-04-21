"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { transitionPendaftaran } from "@/lib/pendaftaran";
import {
  guruDecisionSchema,
  type GuruDecisionInput,
} from "@/lib/validations/pendaftaran";

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

export async function guruDecideAction(
  input: GuruDecisionInput,
): Promise<MutationResult> {
  const ctx = await requireGuru();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  const parsed = guruDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const catatan = d.catatan?.trim() || null;

  const current = await prisma.pendaftaran.findUnique({
    where: { id: d.pendaftaranId },
    select: {
      id: true,
      status: true,
      siswa: { select: { guruId: true } },
    },
  });
  if (!current) return { ok: false, error: "Pendaftaran tidak ditemukan." };
  if (current.siswa.guruId !== ctx.guru.id) {
    return {
      ok: false,
      error: "Siswa ini bukan bimbingan Anda.",
    };
  }
  if (current.status !== "PENDING") {
    return {
      ok: false,
      error: "Pendaftaran sudah diputuskan.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return transitionPendaftaran(tx, {
        pendaftaranId: d.pendaftaranId,
        to: d.approve ? "DISETUJUI_GURU" : "DITOLAK_GURU",
        aktorRole: "GURU_PEMBIMBING",
        aktorId: ctx.guru.id,
        catatan,
      });
    });

    await logAudit({
      userId: ctx.session.user.id,
      action: d.approve ? "GURU_SETUJUI" : "GURU_TOLAK",
      entityType: "Pendaftaran",
      entityId: d.pendaftaranId,
      metadata: { catatan },
    });

    // Notifikasi ke siswa; kalau approve, notifikasi juga ke DUDI.
    await notify({
      userId: result.recipientUserIds.siswa,
      type: "STATUS_PENDAFTARAN",
      judul: d.approve
        ? "Pendaftaran PKL disetujui guru"
        : "Pendaftaran PKL ditolak guru",
      pesan: `Pendaftaran Anda ke ${result.context.perusahaan} ${d.approve ? "disetujui" : "ditolak"} oleh guru pembimbing.`,
      linkUrl: `/siswa/pendaftaran/${d.pendaftaranId}`,
    });
    if (d.approve) {
      await notify({
        userId: result.recipientUserIds.dudi,
        type: "PENDAFTARAN_BARU",
        judul: "Pendaftar baru menunggu review",
        pesan: `${result.context.siswaNama} mendaftar ke ${result.context.lowonganJudul}.`,
        linkUrl: "/dudi/lowongan",
      });
    }

    revalidatePath("/guru/pendaftaran");
    revalidatePath(`/siswa/pendaftaran/${d.pendaftaranId}`);
    return { ok: true };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Gagal memproses keputusan.";
    return { ok: false, error: msg };
  }
}
