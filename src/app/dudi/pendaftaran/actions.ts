"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { transitionPendaftaran } from "@/lib/pendaftaran";
import {
  dudiDecisionSchema,
  type DudiDecisionInput,
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
 * Tandai pendaftaran sebagai "dilihat" saat DUDI membuka detail siswa.
 * Dipanggil dari server component — idempotent: kalau status bukan
 * DISETUJUI_GURU, tidak ada efek.
 */
export async function markPendaftaranDilihatAction(
  pendaftaranId: string,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.pendaftaran.findUnique({
    where: { id: pendaftaranId },
    select: {
      status: true,
      lowongan: { select: { dudiId: true } },
    },
  });
  if (!current) return { ok: false, error: "Pendaftaran tidak ditemukan." };
  if (current.lowongan.dudiId !== ctx.dudi.id) {
    return { ok: false, error: "Pendaftaran ini bukan milik DU/DI Anda." };
  }
  if (current.status !== "DISETUJUI_GURU") {
    return { ok: true };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await transitionPendaftaran(tx, {
        pendaftaranId,
        to: "DILIHAT_DUDI",
        aktorRole: "DUDI",
        aktorId: ctx.dudi.id,
        catatan: null,
      });
    });
    revalidatePath(`/dudi/pendaftaran/${pendaftaranId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memperbarui.";
    return { ok: false, error: msg };
  }
}

export async function dudiDecideAction(
  input: DudiDecisionInput,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  const parsed = dudiDecisionSchema.safeParse(input);
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
      lowonganId: true,
      lowongan: { select: { dudiId: true } },
    },
  });
  if (!current) return { ok: false, error: "Pendaftaran tidak ditemukan." };
  if (current.lowongan.dudiId !== ctx.dudi.id) {
    return { ok: false, error: "Pendaftaran ini bukan milik DU/DI Anda." };
  }
  if (
    current.status !== "DISETUJUI_GURU" &&
    current.status !== "DILIHAT_DUDI"
  ) {
    return {
      ok: false,
      error: "Pendaftaran ini tidak lagi menunggu keputusan DU/DI.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      return transitionPendaftaran(tx, {
        pendaftaranId: d.pendaftaranId,
        to: d.terima ? "DITERIMA" : "DITOLAK_DUDI",
        aktorRole: "DUDI",
        aktorId: ctx.dudi.id,
        catatan,
      });
    });

    await logAudit({
      userId: ctx.session.user.id,
      action: d.terima ? "DUDI_TERIMA" : "DUDI_TOLAK",
      entityType: "Pendaftaran",
      entityId: d.pendaftaranId,
      metadata: { catatan },
    });

    await notify({
      userId: result.recipientUserIds.siswa,
      type: "STATUS_PENDAFTARAN",
      judul: d.terima
        ? "Pendaftaran PKL diterima"
        : "Pendaftaran PKL ditolak DU/DI",
      pesan: d.terima
        ? `Selamat! Anda diterima PKL di ${result.context.perusahaan}.`
        : `Pendaftaran Anda ke ${result.context.perusahaan} ditolak DU/DI.`,
      linkUrl: `/siswa/pendaftaran/${d.pendaftaranId}`,
    });

    revalidatePath("/dudi/lowongan");
    revalidatePath(`/dudi/lowongan/${current.lowonganId}/pendaftar`);
    revalidatePath(`/dudi/pendaftaran/${d.pendaftaranId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memproses keputusan.";
    return { ok: false, error: msg };
  }
}
