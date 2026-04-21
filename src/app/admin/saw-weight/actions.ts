"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  sawWeightSchema,
  type SAWWeightInput,
} from "@/lib/validations/saw";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function requireAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = i.path[0];
    if (typeof k === "string" && !out[k]) out[k] = i.message;
  }
  return out;
}

function normalizeJurusanId(v: string | null | undefined): string | null {
  if (!v || v === "__GLOBAL__") return null;
  return v;
}

/**
 * Constraint DB: @@unique([jurusanId, isActive]). Artinya per jurusan hanya
 * boleh ada 1 record aktif dan 1 record non-aktif. Untuk menghindari konflik
 * saat create/update kita non-aktifkan bobot yang lain secara eksplisit
 * kalau user menandai record baru sebagai aktif.
 */
async function deactivateOthers(
  jurusanId: string | null,
  exceptId: string | null,
) {
  await prisma.sAWWeight.updateMany({
    where: {
      jurusanId,
      isActive: true,
      ...(exceptId ? { NOT: { id: exceptId } } : {}),
    },
    data: { isActive: false },
  });
}

export async function createSAWWeightAction(
  input: SAWWeightInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = sawWeightSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const jurusanId = normalizeJurusanId(d.jurusanId);

  if (d.isActive) {
    await deactivateOthers(jurusanId, null);
  }

  const created = await prisma.sAWWeight.create({
    data: {
      nama: d.nama,
      jurusanId,
      isActive: d.isActive,
      bobotBidang: d.bobotBidang,
      bobotJarak: d.bobotJarak,
      bobotKuota: d.bobotKuota,
      bobotKeahlian: d.bobotKeahlian,
      bobotDokumen: d.bobotDokumen,
      bobotFasilitas: d.bobotFasilitas,
      bobotRating: d.bobotRating,
    },
    select: { id: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_SAW_WEIGHT",
    entityType: "SAWWeight",
    entityId: created.id,
    metadata: { nama: d.nama, jurusanId },
  });

  revalidatePath("/admin/saw-weight");
  return { ok: true };
}

export async function updateSAWWeightAction(
  id: string,
  input: SAWWeightInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = sawWeightSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const jurusanId = normalizeJurusanId(d.jurusanId);

  const current = await prisma.sAWWeight.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "Bobot tidak ditemukan." };

  if (d.isActive) {
    await deactivateOthers(jurusanId, id);
  }

  await prisma.sAWWeight.update({
    where: { id },
    data: {
      nama: d.nama,
      jurusanId,
      isActive: d.isActive,
      bobotBidang: d.bobotBidang,
      bobotJarak: d.bobotJarak,
      bobotKuota: d.bobotKuota,
      bobotKeahlian: d.bobotKeahlian,
      bobotDokumen: d.bobotDokumen,
      bobotFasilitas: d.bobotFasilitas,
      bobotRating: d.bobotRating,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_SAW_WEIGHT",
    entityType: "SAWWeight",
    entityId: id,
    metadata: { nama: d.nama, jurusanId },
  });

  revalidatePath("/admin/saw-weight");
  return { ok: true };
}

export async function deleteSAWWeightAction(
  id: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.sAWWeight.findUnique({
    where: { id },
    select: { nama: true },
  });
  if (!current) return { ok: false, error: "Bobot tidak ditemukan." };

  await prisma.sAWWeight.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_SAW_WEIGHT",
    entityType: "SAWWeight",
    entityId: id,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/saw-weight");
  return { ok: true };
}

/**
 * Toggle status aktif — memastikan hanya 1 record aktif per jurusan.
 * Kalau diaktifkan, record lain dengan jurusanId sama di-non-aktifkan.
 */
export async function setActiveSAWWeightAction(
  id: string,
  isActive: boolean,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.sAWWeight.findUnique({
    where: { id },
    select: { id: true, jurusanId: true, nama: true },
  });
  if (!current) return { ok: false, error: "Bobot tidak ditemukan." };

  if (isActive) {
    await deactivateOthers(current.jurusanId, id);
  }

  await prisma.sAWWeight.update({
    where: { id },
    data: { isActive },
  });

  await logAudit({
    userId: session.user.id,
    action: isActive ? "ACTIVATE_SAW_WEIGHT" : "DEACTIVATE_SAW_WEIGHT",
    entityType: "SAWWeight",
    entityId: id,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/saw-weight");
  return { ok: true };
}
