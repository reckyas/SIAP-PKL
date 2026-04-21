"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { dokumenSchema, type DokumenInput } from "@/lib/validations/master";

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

export async function createDokumenAction(
  input: DokumenInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = dokumenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const used = await prisma.dokumen.findUnique({
    where: { nama: d.nama },
    select: { id: true },
  });
  if (used) {
    return {
      ok: false,
      error: "Nama dokumen sudah dipakai",
      fieldErrors: { nama: "Sudah dipakai" },
    };
  }

  const created = await prisma.dokumen.create({
    data: { nama: d.nama, deskripsi: d.deskripsi?.trim() || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_DOKUMEN",
    entityType: "Dokumen",
    entityId: created.id,
    metadata: { nama: d.nama },
  });

  revalidatePath("/admin/dokumen");
  return { ok: true };
}

export async function updateDokumenAction(
  id: string,
  input: DokumenInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = dokumenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const current = await prisma.dokumen.findUnique({
    where: { id },
    select: { id: true, nama: true },
  });
  if (!current) return { ok: false, error: "Dokumen tidak ditemukan." };

  if (d.nama !== current.nama) {
    const used = await prisma.dokumen.findUnique({
      where: { nama: d.nama },
      select: { id: true },
    });
    if (used && used.id !== id) {
      return {
        ok: false,
        error: "Nama dokumen sudah dipakai",
        fieldErrors: { nama: "Sudah dipakai" },
      };
    }
  }

  await prisma.dokumen.update({
    where: { id },
    data: { nama: d.nama, deskripsi: d.deskripsi?.trim() || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_DOKUMEN",
    entityType: "Dokumen",
    entityId: id,
    metadata: { nama: d.nama },
  });

  revalidatePath("/admin/dokumen");
  return { ok: true };
}

export async function deleteDokumenAction(
  id: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const [siswaCount, lowonganCount] = await Promise.all([
    prisma.siswaDokumen.count({ where: { dokumenId: id } }),
    prisma.lowonganDokumen.count({ where: { dokumenId: id } }),
  ]);
  if (siswaCount + lowonganCount > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: dipakai di ${siswaCount} data siswa dan ${lowonganCount} lowongan.`,
    };
  }

  const current = await prisma.dokumen.findUnique({
    where: { id },
    select: { nama: true },
  });
  if (!current) return { ok: false, error: "Dokumen tidak ditemukan." };

  await prisma.dokumen.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_DOKUMEN",
    entityType: "Dokumen",
    entityId: id,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/dokumen");
  return { ok: true };
}
