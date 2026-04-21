"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import {
  logbookEntrySchema,
  type LogbookEntryInput,
} from "@/lib/validations/logbook";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: { id: string };
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
    select: {
      id: true,
      nama: true,
      statusPKL: true,
      guru: { select: { userId: true } },
    },
  });
  if (!siswa) return null;
  return { session: s, siswa };
}

/**
 * Ambil pendaftaran DITERIMA milik siswa + tanggal lowongan-nya.
 * Dipakai untuk validasi lifecycle mulai/selesai PKL.
 */
async function findPendaftaranDiterima(siswaId: string) {
  return prisma.pendaftaran.findFirst({
    where: { siswaId, status: "DITERIMA" },
    select: {
      id: true,
      lowongan: {
        select: {
          id: true,
          judul: true,
          tanggalMulai: true,
          tanggalSelesai: true,
          dudi: { select: { namaPerusahaan: true } },
        },
      },
    },
  });
}

export async function mulaiPKLAction(): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  if (ctx.siswa.statusPKL === "SEDANG_PKL") {
    return { ok: false, error: "PKL sudah dimulai." };
  }
  if (ctx.siswa.statusPKL !== "DITERIMA") {
    return {
      ok: false,
      error: "Anda belum diterima di lowongan manapun.",
    };
  }

  const p = await findPendaftaranDiterima(ctx.siswa.id);
  if (!p) {
    return { ok: false, error: "Pendaftaran diterima tidak ditemukan." };
  }
  const now = new Date();
  if (now < p.lowongan.tanggalMulai) {
    return {
      ok: false,
      error: `PKL baru bisa dimulai pada ${p.lowongan.tanggalMulai.toLocaleDateString("id-ID")}.`,
    };
  }

  await prisma.siswa.update({
    where: { id: ctx.siswa.id },
    data: { statusPKL: "SEDANG_PKL" },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "MULAI_PKL",
    entityType: "Siswa",
    entityId: ctx.siswa.id,
    metadata: { pendaftaranId: p.id, lowonganId: p.lowongan.id },
  });

  if (ctx.siswa.guru?.userId) {
    await notify({
      userId: ctx.siswa.guru.userId,
      type: "SISTEM",
      judul: "Siswa mulai PKL",
      pesan: `${ctx.siswa.nama} memulai PKL di ${p.lowongan.dudi.namaPerusahaan}.`,
      linkUrl: "/guru/logbook",
    });
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/logbook");
  return { ok: true };
}

export async function selesaiPKLAction(): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  if (ctx.siswa.statusPKL !== "SEDANG_PKL") {
    return { ok: false, error: "Anda belum dalam status SEDANG_PKL." };
  }

  const p = await findPendaftaranDiterima(ctx.siswa.id);
  if (!p) {
    return { ok: false, error: "Pendaftaran diterima tidak ditemukan." };
  }
  const now = new Date();
  if (now < p.lowongan.tanggalSelesai) {
    return {
      ok: false,
      error: `PKL baru bisa diselesaikan setelah ${p.lowongan.tanggalSelesai.toLocaleDateString("id-ID")}.`,
    };
  }

  await prisma.siswa.update({
    where: { id: ctx.siswa.id },
    data: { statusPKL: "SELESAI" },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "SELESAI_PKL",
    entityType: "Siswa",
    entityId: ctx.siswa.id,
    metadata: { pendaftaranId: p.id },
  });

  if (ctx.siswa.guru?.userId) {
    await notify({
      userId: ctx.siswa.guru.userId,
      type: "SISTEM",
      judul: "Siswa menyelesaikan PKL",
      pesan: `${ctx.siswa.nama} menandai PKL selesai di ${p.lowongan.dudi.namaPerusahaan}.`,
      linkUrl: "/guru/logbook",
    });
  }

  revalidatePath("/siswa");
  revalidatePath("/siswa/logbook");
  return { ok: true };
}

export async function createLogbookAction(
  input: LogbookEntryInput,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  if (ctx.siswa.statusPKL !== "SEDANG_PKL") {
    return {
      ok: false,
      error: "Logbook hanya bisa diisi saat status Anda SEDANG_PKL.",
    };
  }

  const parsed = logbookEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const kendala = d.kendala?.trim() || null;

  // Cegah duplikat per-tanggal.
  const dup = await prisma.logbook.findFirst({
    where: {
      siswaId: ctx.siswa.id,
      tanggal: d.tanggal,
    },
    select: { id: true },
  });
  if (dup) {
    return {
      ok: false,
      error: "Sudah ada logbook untuk tanggal tersebut.",
    };
  }

  const created = await prisma.logbook.create({
    data: {
      siswaId: ctx.siswa.id,
      tanggal: d.tanggal,
      kegiatan: d.kegiatan,
      kendala,
      lampiranUrls: d.lampiranUrls,
      status: "DRAFT",
    },
    select: { id: true },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "LOGBOOK_CREATE",
    entityType: "Logbook",
    entityId: created.id,
  });

  revalidatePath("/siswa/logbook");
  return { ok: true, data: { id: created.id } };
}

export async function updateLogbookAction(
  input: LogbookEntryInput,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  if (!input.id) return { ok: false, error: "ID logbook tidak ada." };

  const parsed = logbookEntrySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.logbook.findUnique({
    where: { id: input.id },
    select: { id: true, siswaId: true, status: true },
  });
  if (!current || current.siswaId !== ctx.siswa.id) {
    return { ok: false, error: "Logbook tidak ditemukan." };
  }
  if (current.status !== "DRAFT" && current.status !== "REVISED") {
    return {
      ok: false,
      error: "Logbook yang sudah dikirim tidak bisa diedit.",
    };
  }

  await prisma.logbook.update({
    where: { id: current.id },
    data: {
      tanggal: d.tanggal,
      kegiatan: d.kegiatan,
      kendala: d.kendala?.trim() || null,
      lampiranUrls: d.lampiranUrls,
    },
  });

  revalidatePath("/siswa/logbook");
  revalidatePath(`/siswa/logbook/${current.id}`);
  return { ok: true, data: { id: current.id } };
}

export async function submitLogbookAction(
  logbookId: string,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.logbook.findUnique({
    where: { id: logbookId },
    select: { id: true, siswaId: true, status: true, tanggal: true },
  });
  if (!current || current.siswaId !== ctx.siswa.id) {
    return { ok: false, error: "Logbook tidak ditemukan." };
  }
  if (current.status !== "DRAFT" && current.status !== "REVISED") {
    return { ok: false, error: "Logbook tidak bisa dikirim lagi." };
  }

  await prisma.logbook.update({
    where: { id: current.id },
    data: { status: "SUBMITTED" },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "LOGBOOK_SUBMIT",
    entityType: "Logbook",
    entityId: current.id,
  });

  if (ctx.siswa.guru?.userId) {
    await notify({
      userId: ctx.siswa.guru.userId,
      type: "LOGBOOK_REVIEW",
      judul: "Logbook menunggu review",
      pesan: `${ctx.siswa.nama} mengirim logbook tanggal ${current.tanggal.toLocaleDateString("id-ID")}.`,
      linkUrl: `/guru/logbook/${current.id}`,
    });
  }

  revalidatePath("/siswa/logbook");
  revalidatePath(`/siswa/logbook/${current.id}`);
  return { ok: true, data: { id: current.id } };
}

export async function deleteLogbookAction(
  logbookId: string,
): Promise<MutationResult> {
  const ctx = await requireSiswa();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.logbook.findUnique({
    where: { id: logbookId },
    select: { id: true, siswaId: true, status: true },
  });
  if (!current || current.siswaId !== ctx.siswa.id) {
    return { ok: false, error: "Logbook tidak ditemukan." };
  }
  if (current.status !== "DRAFT") {
    return {
      ok: false,
      error: "Hanya logbook draft yang bisa dihapus.",
    };
  }

  await prisma.logbook.delete({ where: { id: current.id } });

  await logAudit({
    userId: ctx.session.user.id,
    action: "LOGBOOK_DELETE",
    entityType: "Logbook",
    entityId: current.id,
  });

  revalidatePath("/siswa/logbook");
  return { ok: true };
}
