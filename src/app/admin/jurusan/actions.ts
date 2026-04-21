"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { jurusanSchema, type JurusanInput } from "@/lib/validations/master";

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

export async function createJurusanAction(
  input: JurusanInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = jurusanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const used = await prisma.jurusan.findUnique({
    where: { kode: d.kode },
    select: { id: true },
  });
  if (used) {
    return {
      ok: false,
      error: "Kode jurusan sudah dipakai",
      fieldErrors: { kode: "Sudah dipakai" },
    };
  }

  const created = await prisma.jurusan.create({
    data: {
      kode: d.kode,
      nama: d.nama,
      deskripsi: d.deskripsi?.trim() || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_JURUSAN",
    entityType: "Jurusan",
    entityId: created.id,
    metadata: { kode: d.kode, nama: d.nama },
  });

  revalidatePath("/admin/jurusan");
  return { ok: true };
}

export async function updateJurusanAction(
  id: string,
  input: JurusanInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = jurusanSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.jurusan.findUnique({
    where: { id },
    select: { id: true, kode: true },
  });
  if (!current) return { ok: false, error: "Jurusan tidak ditemukan." };

  if (d.kode !== current.kode) {
    const used = await prisma.jurusan.findUnique({
      where: { kode: d.kode },
      select: { id: true },
    });
    if (used && used.id !== id) {
      return {
        ok: false,
        error: "Kode jurusan sudah dipakai",
        fieldErrors: { kode: "Sudah dipakai" },
      };
    }
  }

  await prisma.jurusan.update({
    where: { id },
    data: {
      kode: d.kode,
      nama: d.nama,
      deskripsi: d.deskripsi?.trim() || null,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_JURUSAN",
    entityType: "Jurusan",
    entityId: id,
    metadata: { kode: d.kode },
  });

  revalidatePath("/admin/jurusan");
  return { ok: true };
}

export async function deleteJurusanAction(
  id: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const [siswaCount, weightCount] = await Promise.all([
    prisma.siswa.count({ where: { jurusanId: id, deletedAt: null } }),
    prisma.sAWWeight.count({ where: { jurusanId: id } }),
  ]);
  if (siswaCount > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: ${siswaCount} siswa masih memakai jurusan ini.`,
    };
  }
  if (weightCount > 0) {
    return {
      ok: false,
      error: `Tidak bisa dihapus: ada ${weightCount} konfigurasi bobot SAW per-jurusan. Hapus atau pindahkan dulu.`,
    };
  }

  const current = await prisma.jurusan.findUnique({
    where: { id },
    select: { kode: true, nama: true },
  });
  if (!current) return { ok: false, error: "Jurusan tidak ditemukan." };

  await prisma.jurusan.delete({ where: { id } });

  await logAudit({
    userId: session.user.id,
    action: "DELETE_JURUSAN",
    entityType: "Jurusan",
    entityId: id,
    metadata: { kode: current.kode, nama: current.nama },
  });

  revalidatePath("/admin/jurusan");
  return { ok: true };
}
