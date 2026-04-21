"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { keahlianSchema, type KeahlianInput } from "@/lib/validations/master";

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

export async function createKeahlianAction(
  input: KeahlianInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = keahlianSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const used = await prisma.keahlian.findUnique({
    where: { nama: d.nama },
    select: { id: true },
  });
  if (used) {
    return {
      ok: false,
      error: "Nama keahlian sudah dipakai",
      fieldErrors: { nama: "Sudah dipakai" },
    };
  }

  const created = await prisma.keahlian.create({
    data: { nama: d.nama, kategori: d.kategori?.trim() || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_KEAHLIAN",
    entityType: "Keahlian",
    entityId: created.id,
    metadata: { nama: d.nama },
  });

  revalidatePath("/admin/keahlian");
  return { ok: true };
}

export async function updateKeahlianAction(
  id: string,
  input: KeahlianInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  const parsed = keahlianSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const current = await prisma.keahlian.findUnique({
    where: { id },
    select: { id: true, nama: true },
  });
  if (!current) return { ok: false, error: "Keahlian tidak ditemukan." };

  if (d.nama !== current.nama) {
    const used = await prisma.keahlian.findUnique({
      where: { nama: d.nama },
      select: { id: true },
    });
    if (used && used.id !== id) {
      return {
        ok: false,
        error: "Nama keahlian sudah dipakai",
        fieldErrors: { nama: "Sudah dipakai" },
      };
    }
  }

  await prisma.keahlian.update({
    where: { id },
    data: { nama: d.nama, kategori: d.kategori?.trim() || null },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_KEAHLIAN",
    entityType: "Keahlian",
    entityId: id,
    metadata: { nama: d.nama },
  });

  revalidatePath("/admin/keahlian");
  return { ok: true };
}

export async function deleteKeahlianAction(
  id: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const [siswaCount, lowonganCount] = await Promise.all([
    prisma.siswaKeahlian.count({ where: { keahlianId: id } }),
    prisma.lowonganKeahlian.count({ where: { keahlianId: id } }),
  ]);
  if (siswaCount + lowonganCount > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: dipakai di ${siswaCount} data siswa dan ${lowonganCount} lowongan.`,
    };
  }

  const current = await prisma.keahlian.findUnique({
    where: { id },
    select: { nama: true },
  });
  if (!current) return { ok: false, error: "Keahlian tidak ditemukan." };

  await prisma.keahlian.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_KEAHLIAN",
    entityType: "Keahlian",
    entityId: id,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/keahlian");
  return { ok: true };
}
