"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { kelasSchema, type KelasInput } from "@/lib/validations/kelas";

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

export async function createKelasAction(
  input: KelasInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = kelasSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const jurusan = await prisma.jurusan.findUnique({
    where: { id: d.jurusanId },
    select: { id: true },
  });
  if (!jurusan) {
    return {
      ok: false,
      error: "Jurusan tidak ditemukan",
      fieldErrors: { jurusanId: "Jurusan tidak ditemukan" },
    };
  }

  const duplicate = await prisma.kelas.findUnique({
    where: {
      jurusanId_tingkat_nama: {
        jurusanId: d.jurusanId,
        tingkat: d.tingkat,
        nama: d.nama,
      },
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      ok: false,
      error: "Kelas sudah ada",
      fieldErrors: { nama: "Nama kelas sudah dipakai di jurusan & tingkat ini" },
    };
  }

  const created = await prisma.kelas.create({
    data: {
      nama: d.nama,
      tingkat: d.tingkat,
      jurusanId: d.jurusanId,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_KELAS",
    entityType: "Kelas",
    entityId: created.id,
    metadata: { nama: d.nama, tingkat: d.tingkat, jurusanId: d.jurusanId },
  });

  revalidatePath("/admin/kelas");
  return { ok: true };
}

export async function updateKelasAction(
  id: string,
  input: KelasInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = kelasSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.kelas.findUnique({
    where: { id },
    select: { id: true, nama: true, tingkat: true, jurusanId: true },
  });
  if (!current) return { ok: false, error: "Kelas tidak ditemukan." };

  const jurusan = await prisma.jurusan.findUnique({
    where: { id: d.jurusanId },
    select: { id: true },
  });
  if (!jurusan) {
    return {
      ok: false,
      error: "Jurusan tidak ditemukan",
      fieldErrors: { jurusanId: "Jurusan tidak ditemukan" },
    };
  }

  const changed =
    d.nama !== current.nama ||
    d.tingkat !== current.tingkat ||
    d.jurusanId !== current.jurusanId;
  if (changed) {
    const duplicate = await prisma.kelas.findUnique({
      where: {
        jurusanId_tingkat_nama: {
          jurusanId: d.jurusanId,
          tingkat: d.tingkat,
          nama: d.nama,
        },
      },
      select: { id: true },
    });
    if (duplicate && duplicate.id !== id) {
      return {
        ok: false,
        error: "Kelas sudah ada",
        fieldErrors: {
          nama: "Nama kelas sudah dipakai di jurusan & tingkat ini",
        },
      };
    }
  }

  await prisma.kelas.update({
    where: { id },
    data: {
      nama: d.nama,
      tingkat: d.tingkat,
      jurusanId: d.jurusanId,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_KELAS",
    entityType: "Kelas",
    entityId: id,
    metadata: { nama: d.nama, tingkat: d.tingkat, jurusanId: d.jurusanId },
  });

  revalidatePath("/admin/kelas");
  revalidatePath("/admin/siswa");
  return { ok: true };
}

export async function deleteKelasAction(id: string): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.kelas.findUnique({
    where: { id },
    select: { nama: true, tingkat: true, _count: { select: { siswa: true } } },
  });
  if (!current) return { ok: false, error: "Kelas tidak ditemukan." };

  if (current._count.siswa > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: ${current._count.siswa} siswa masih terhubung ke kelas ini.`,
    };
  }

  await prisma.kelas.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_KELAS",
    entityType: "Kelas",
    entityId: id,
    metadata: { nama: current.nama, tingkat: current.tingkat },
  });

  revalidatePath("/admin/kelas");
  return { ok: true };
}
