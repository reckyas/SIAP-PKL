"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { lowonganSchema, type LowonganInput } from "@/lib/validations/lowongan";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  data?: { id: string };
}

async function requireDudi() {
  const s = await auth();
  if (!s?.user || s.user.role !== "DUDI") return null;
  const dudi = await prisma.dUDI.findUnique({
    where: { userId: s.user.id },
    select: { id: true, user: { select: { status: true } } },
  });
  if (!dudi) return null;
  if (dudi.user.status !== "VERIFIED") return null;
  return { session: s, dudiId: dudi.id };
}

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

function dedupeKeahlian(list: LowonganInput["keahlianDibutuhkan"]) {
  const seen = new Set<string>();
  return list.filter((k) => {
    if (seen.has(k.keahlianId)) return false;
    seen.add(k.keahlianId);
    return true;
  });
}

function dedupeDokumen(list: LowonganInput["dokumenDibutuhkan"]) {
  const seen = new Set<string>();
  return list.filter((d) => {
    if (seen.has(d.dokumenId)) return false;
    seen.add(d.dokumenId);
    return true;
  });
}

function dedupeJurusan(list: string[]) {
  return Array.from(new Set(list));
}

function dedupeBidang(list: string[]) {
  return Array.from(new Set(list));
}

export async function createLowonganAction(
  input: LowonganInput,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  const parsed = lowonganSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const created = await prisma.lowongan.create({
    data: {
      dudiId: ctx.dudiId,
      judul: d.judul,
      deskripsi: d.deskripsi,
      kuotaTotal: d.kuotaTotal,
      kuotaLaki: d.kuotaLaki,
      kuotaPerempuan: d.kuotaPerempuan,
      tanggalMulai: d.tanggalMulai,
      tanggalSelesai: d.tanggalSelesai,
      nilaiMinimum: d.nilaiMinimum ?? null,
      uangSaku: d.uangSaku ?? null,
      makanSiang: d.makanSiang,
      transport: d.transport,
      fasilitasLain: d.fasilitasLain?.trim() || null,
      jamKerja: d.jamKerja?.trim() || null,
      hariKerja: d.hariKerja?.trim() || null,
      dressCode: d.dressCode?.trim() || null,
      catatanKhusus: d.catatanKhusus?.trim() || null,
      status: "DRAFT",
      keahlianDibutuhkan: {
        createMany: {
          data: dedupeKeahlian(d.keahlianDibutuhkan).map((k) => ({
            keahlianId: k.keahlianId,
            levelMinimum: k.levelMinimum,
          })),
        },
      },
      dokumenDibutuhkan: {
        createMany: {
          data: dedupeDokumen(d.dokumenDibutuhkan).map((x) => ({
            dokumenId: x.dokumenId,
            wajib: x.wajib,
          })),
        },
      },
      jurusanTarget: {
        createMany: {
          data: dedupeJurusan(d.jurusanIds).map((jid) => ({ jurusanId: jid })),
        },
      },
      bidang: {
        createMany: {
          data: dedupeBidang(d.bidang).map((bid) => ({ bidangId: bid })),
        },
      },
    },
    select: { id: true },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "CREATE_LOWONGAN",
    entityType: "Lowongan",
    entityId: created.id,
    metadata: { judul: d.judul },
  });

  revalidatePath("/dudi/lowongan");
  return { ok: true, data: { id: created.id } };
}

export async function updateLowonganAction(
  id: string,
  input: LowonganInput,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };
  const parsed = lowonganSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.lowongan.findUnique({
    where: { id },
    select: {
      dudiId: true,
      status: true,
      terisiLaki: true,
      terisiPerempuan: true,
    },
  });
  if (!current || current.dudiId !== ctx.dudiId) {
    return { ok: false, error: "Lowongan tidak ditemukan." };
  }
  if (current.status === "CLOSED") {
    return { ok: false, error: "Lowongan sudah ditutup, tidak bisa diedit." };
  }
  // Kuota total tidak boleh lebih kecil dari yang sudah terisi.
  const terisiTotal = current.terisiLaki + current.terisiPerempuan;
  if (d.kuotaTotal < terisiTotal) {
    return {
      ok: false,
      error: `Kuota total (${d.kuotaTotal}) tidak boleh kurang dari yang sudah terisi (${terisiTotal}).`,
      fieldErrors: { kuotaTotal: "Kurang dari terisi" },
    };
  }

  await prisma.$transaction([
    prisma.lowongan.update({
      where: { id },
      data: {
        judul: d.judul,
        deskripsi: d.deskripsi,
        kuotaTotal: d.kuotaTotal,
        kuotaLaki: d.kuotaLaki,
        kuotaPerempuan: d.kuotaPerempuan,
        tanggalMulai: d.tanggalMulai,
        tanggalSelesai: d.tanggalSelesai,
        nilaiMinimum: d.nilaiMinimum ?? null,
        uangSaku: d.uangSaku ?? null,
        makanSiang: d.makanSiang,
        transport: d.transport,
        fasilitasLain: d.fasilitasLain?.trim() || null,
        jamKerja: d.jamKerja?.trim() || null,
        hariKerja: d.hariKerja?.trim() || null,
        dressCode: d.dressCode?.trim() || null,
        catatanKhusus: d.catatanKhusus?.trim() || null,
      },
    }),
    prisma.lowonganKeahlian.deleteMany({ where: { lowonganId: id } }),
    prisma.lowonganKeahlian.createMany({
      data: dedupeKeahlian(d.keahlianDibutuhkan).map((k) => ({
        lowonganId: id,
        keahlianId: k.keahlianId,
        levelMinimum: k.levelMinimum,
      })),
    }),
    prisma.lowonganDokumen.deleteMany({ where: { lowonganId: id } }),
    prisma.lowonganDokumen.createMany({
      data: dedupeDokumen(d.dokumenDibutuhkan).map((x) => ({
        lowonganId: id,
        dokumenId: x.dokumenId,
        wajib: x.wajib,
      })),
    }),
    prisma.lowonganJurusan.deleteMany({ where: { lowonganId: id } }),
    prisma.lowonganJurusan.createMany({
      data: dedupeJurusan(d.jurusanIds).map((jid) => ({
        lowonganId: id,
        jurusanId: jid,
      })),
    }),
    prisma.lowonganBidang.deleteMany({ where: { lowonganId: id } }),
    prisma.lowonganBidang.createMany({
      data: dedupeBidang(d.bidang).map((bid) => ({
        lowonganId: id,
        bidangId: bid,
      })),
    }),
  ]);

  await logAudit({
    userId: ctx.session.user.id,
    action: "UPDATE_LOWONGAN",
    entityType: "Lowongan",
    entityId: id,
    metadata: { judul: d.judul },
  });

  revalidatePath("/dudi/lowongan");
  revalidatePath(`/dudi/lowongan/${id}/edit`);
  return { ok: true, data: { id } };
}

export async function deleteLowonganAction(
  id: string,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.lowongan.findUnique({
    where: { id },
    select: {
      dudiId: true,
      status: true,
      judul: true,
      _count: { select: { pendaftaran: true } },
    },
  });
  if (!current || current.dudiId !== ctx.dudiId) {
    return { ok: false, error: "Lowongan tidak ditemukan." };
  }
  if (current._count.pendaftaran > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: sudah ada ${current._count.pendaftaran} pendaftar. Tutup saja lowongan.`,
    };
  }

  await prisma.lowongan.delete({ where: { id } });

  await logAudit({
    userId: ctx.session.user.id,
    action: "DELETE_LOWONGAN",
    entityType: "Lowongan",
    entityId: id,
    metadata: { judul: current.judul },
  });

  revalidatePath("/dudi/lowongan");
  return { ok: true };
}

/**
 * DRAFT → OPEN. Wajib punya minimal 1 keahlian atau 1 dokumen? Tidak,
 * hanya wajib kuota > 0 dan tanggal valid (sudah dijamin schema).
 */
export async function publishLowonganAction(
  id: string,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.lowongan.findUnique({
    where: { id },
    select: { dudiId: true, status: true, judul: true, tanggalSelesai: true },
  });
  if (!current || current.dudiId !== ctx.dudiId) {
    return { ok: false, error: "Lowongan tidak ditemukan." };
  }
  if (current.status !== "DRAFT") {
    return { ok: false, error: "Hanya lowongan DRAFT yang bisa dipublikasi." };
  }
  if (current.tanggalSelesai < new Date()) {
    return { ok: false, error: "Tanggal selesai sudah lewat." };
  }

  await prisma.lowongan.update({
    where: { id },
    data: { status: "OPEN" },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "PUBLISH_LOWONGAN",
    entityType: "Lowongan",
    entityId: id,
    metadata: { judul: current.judul },
  });

  revalidatePath("/dudi/lowongan");
  revalidatePath("/siswa/lowongan");
  return { ok: true };
}

export async function closeLowonganAction(
  id: string,
): Promise<MutationResult> {
  const ctx = await requireDudi();
  if (!ctx) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.lowongan.findUnique({
    where: { id },
    select: { dudiId: true, status: true, judul: true },
  });
  if (!current || current.dudiId !== ctx.dudiId) {
    return { ok: false, error: "Lowongan tidak ditemukan." };
  }
  if (current.status !== "OPEN" && current.status !== "FULL") {
    return {
      ok: false,
      error: "Hanya lowongan OPEN/FULL yang bisa ditutup.",
    };
  }

  await prisma.lowongan.update({
    where: { id },
    data: { status: "CLOSED" },
  });

  await logAudit({
    userId: ctx.session.user.id,
    action: "CLOSE_LOWONGAN",
    entityType: "Lowongan",
    entityId: id,
    metadata: { judul: current.judul },
  });

  revalidatePath("/dudi/lowongan");
  revalidatePath("/siswa/lowongan");
  return { ok: true };
}
