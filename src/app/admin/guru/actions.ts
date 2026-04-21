"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  createGuruSchema,
  editGuruSchema,
  type CreateGuruInput,
  type EditGuruInput,
} from "@/lib/validations/guru";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

async function requireAdmin() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") return null;
  return s;
}

function zodFieldErrors(
  err: import("zod").ZodError,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

function defaultPassword(nip: string | null): string {
  if (nip && nip.length >= 8) return nip;
  return "guru12345";
}

export async function createGuruAction(
  input: CreateGuruInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = createGuruSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();
  const nip = d.nip?.trim() || null;

  const emailUsed = await prisma.user.findUnique({
    where: { email: emailLower },
    select: { id: true },
  });
  if (emailUsed) {
    return {
      ok: false,
      error: "Email sudah terpakai",
      fieldErrors: { email: "Email sudah terpakai" },
    };
  }
  if (nip) {
    const nipUsed = await prisma.guru.findUnique({
      where: { nip },
      select: { id: true },
    });
    if (nipUsed) {
      return {
        ok: false,
        error: "NIP sudah terpakai",
        fieldErrors: { nip: "NIP sudah terpakai" },
      };
    }
  }

  const rawPassword =
    d.passwordAwal && d.passwordAwal.length >= 8
      ? d.passwordAwal
      : defaultPassword(nip);
  const hashed = await bcrypt.hash(rawPassword, 10);

  const created = await prisma.user.create({
    data: {
      email: emailLower,
      password: hashed,
      role: "GURU_PEMBIMBING",
      status: "VERIFIED",
      mustChangePassword: true,
      guru: {
        create: {
          nama: d.nama,
          nip,
          noHp: d.noHp,
          mataPelajaran: d.mataPelajaran?.trim() || null,
        },
      },
    },
    select: { id: true, guru: { select: { id: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_GURU",
    entityType: "Guru",
    entityId: created.guru?.id ?? null,
    metadata: { email: emailLower, nama: d.nama },
  });

  revalidatePath("/admin/guru");
  return { ok: true, id: created.guru?.id };
}

export async function updateGuruAction(
  guruId: string,
  input: EditGuruInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = editGuruSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();
  const nip = d.nip?.trim() || null;

  const current = await prisma.guru.findUnique({
    where: { id: guruId },
    select: {
      id: true,
      userId: true,
      nip: true,
      user: { select: { email: true } },
    },
  });
  if (!current) return { ok: false, error: "Guru tidak ditemukan." };

  if (emailLower !== current.user.email.toLowerCase()) {
    const used = await prisma.user.findUnique({
      where: { email: emailLower },
      select: { id: true },
    });
    if (used && used.id !== current.userId) {
      return {
        ok: false,
        error: "Email sudah terpakai",
        fieldErrors: { email: "Email sudah terpakai" },
      };
    }
  }
  if (nip && nip !== current.nip) {
    const used = await prisma.guru.findUnique({
      where: { nip },
      select: { id: true },
    });
    if (used && used.id !== guruId) {
      return {
        ok: false,
        error: "NIP sudah terpakai",
        fieldErrors: { nip: "NIP sudah terpakai" },
      };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: current.userId },
      data: { email: emailLower },
    }),
    prisma.guru.update({
      where: { id: guruId },
      data: {
        nama: d.nama,
        nip,
        noHp: d.noHp,
        mataPelajaran: d.mataPelajaran?.trim() || null,
      },
    }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_GURU",
    entityType: "Guru",
    entityId: guruId,
    metadata: { email: emailLower },
  });

  revalidatePath("/admin/guru");
  revalidatePath(`/admin/guru/${guruId}/edit`);
  return { ok: true };
}

/**
 * Soft-delete guru. Kalau guru masih membimbing siswa, kita lepaskan
 * referensi Siswa.guruId dulu supaya soft-delete tidak melanggar integritas
 * laporan (siswa jadi "belum dibimbing").
 */
export async function deleteGuruAction(
  guruId: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.guru.findUnique({
    where: { id: guruId },
    select: { userId: true, nama: true },
  });
  if (!current) return { ok: false, error: "Guru tidak ditemukan." };

  const now = new Date();
  await prisma.$transaction([
    prisma.siswa.updateMany({
      where: { guruId },
      data: { guruId: null },
    }),
    prisma.user.update({
      where: { id: current.userId },
      data: { deletedAt: now, status: "SUSPENDED" },
    }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "DELETE_GURU",
    entityType: "Guru",
    entityId: guruId,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/guru");
  revalidatePath("/admin/siswa");
  return { ok: true };
}

export async function resetGuruPasswordAction(
  guruId: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const guru = await prisma.guru.findUnique({
    where: { id: guruId },
    select: { userId: true, nip: true, nama: true },
  });
  if (!guru) return { ok: false, error: "Guru tidak ditemukan." };

  const raw = defaultPassword(guru.nip);
  const hashed = await bcrypt.hash(raw, 10);
  await prisma.user.update({
    where: { id: guru.userId },
    data: { password: hashed, mustChangePassword: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "RESET_PASSWORD_GURU",
    entityType: "Guru",
    entityId: guruId,
    metadata: { nama: guru.nama },
  });

  return { ok: true };
}
