"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  createSiswaSchema,
  editSiswaSchema,
  type CreateSiswaInput,
  type EditSiswaInput,
} from "@/lib/validations/siswa";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
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

export async function createSiswaAction(
  input: CreateSiswaInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = createSiswaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();

  // Pre-check: email unik + NIS unik supaya pesan error lebih jelas
  const [emailUsed, nisUsed] = await Promise.all([
    prisma.user.findUnique({ where: { email: emailLower }, select: { id: true } }),
    prisma.siswa.findUnique({ where: { nis: d.nis }, select: { id: true } }),
  ]);
  if (emailUsed) {
    return {
      ok: false,
      error: "Email sudah terpakai",
      fieldErrors: { email: "Email sudah terpakai" },
    };
  }
  if (nisUsed) {
    return {
      ok: false,
      error: "NIS sudah terpakai",
      fieldErrors: { nis: "NIS sudah terpakai" },
    };
  }

  const kelas = await prisma.kelas.findUnique({
    where: { id: d.kelasId },
    select: { jurusanId: true },
  });
  if (!kelas || kelas.jurusanId !== d.jurusanId) {
    return {
      ok: false,
      error: "Kelas tidak sesuai dengan jurusan yang dipilih.",
      fieldErrors: { kelasId: "Kelas tidak sesuai jurusan" },
    };
  }

  // Password awal: input admin atau default = NIS (min 8 dipenuhi karena NIS >=4…
  // jaga-jaga kalau NIS pendek, pad dengan 'siswa'+NIS)
  const rawPassword =
    d.passwordAwal && d.passwordAwal.length >= 8
      ? d.passwordAwal
      : d.nis.length >= 8
        ? d.nis
        : `siswa${d.nis}`;
  const hashed = await bcrypt.hash(rawPassword, 10);

  const created = await prisma.user.create({
    data: {
      email: emailLower,
      password: hashed,
      role: "SISWA",
      status: "VERIFIED",
      mustChangePassword: true,
      siswa: {
        create: {
          nis: d.nis,
          nama: d.nama,
          jenisKelamin: d.jenisKelamin,
          tanggalLahir: d.tanggalLahir,
          alamat: d.alamat,
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          noHp: d.noHp,
          kelasId: d.kelasId,
          jurusanId: d.jurusanId,
          guruId: d.guruId || null,
        },
      },
    },
    select: { id: true, siswa: { select: { id: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_SISWA",
    entityType: "Siswa",
    entityId: created.siswa?.id ?? null,
    metadata: { email: emailLower, nis: d.nis, nama: d.nama },
  });

  revalidatePath("/admin/siswa");
  return { ok: true, id: created.siswa?.id };
}

export async function updateSiswaAction(
  siswaId: string,
  input: EditSiswaInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = editSiswaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();

  const current = await prisma.siswa.findUnique({
    where: { id: siswaId },
    select: { id: true, userId: true, nis: true, user: { select: { email: true } } },
  });
  if (!current) return { ok: false, error: "Siswa tidak ditemukan." };

  // Cek konflik email/NIS hanya kalau berubah
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
  if (d.nis !== current.nis) {
    const used = await prisma.siswa.findUnique({
      where: { nis: d.nis },
      select: { id: true },
    });
    if (used && used.id !== siswaId) {
      return {
        ok: false,
        error: "NIS sudah terpakai",
        fieldErrors: { nis: "NIS sudah terpakai" },
      };
    }
  }

  const kelas = await prisma.kelas.findUnique({
    where: { id: d.kelasId },
    select: { jurusanId: true },
  });
  if (!kelas || kelas.jurusanId !== d.jurusanId) {
    return {
      ok: false,
      error: "Kelas tidak sesuai dengan jurusan yang dipilih.",
      fieldErrors: { kelasId: "Kelas tidak sesuai jurusan" },
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: current.userId },
      data: { email: emailLower },
    }),
    prisma.siswa.update({
      where: { id: siswaId },
      data: {
        nis: d.nis,
        nama: d.nama,
        jenisKelamin: d.jenisKelamin,
        tanggalLahir: d.tanggalLahir,
        alamat: d.alamat,
        latitude: d.latitude ?? null,
        longitude: d.longitude ?? null,
        noHp: d.noHp,
        kelasId: d.kelasId,
        jurusanId: d.jurusanId,
        guruId: d.guruId || null,
      },
    }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "UPDATE_SISWA",
    entityType: "Siswa",
    entityId: siswaId,
    metadata: { email: emailLower, nis: d.nis },
  });

  revalidatePath("/admin/siswa");
  revalidatePath(`/admin/siswa/${siswaId}/edit`);
  return { ok: true, id: siswaId };
}

/**
 * Soft-delete siswa. Set User.deletedAt + Siswa.deletedAt.
 * Rekam PKL dll tidak ikut terhapus — audit trail tetap tersimpan.
 */
export async function deleteSiswaAction(
  siswaId: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const current = await prisma.siswa.findUnique({
    where: { id: siswaId },
    select: { userId: true, nama: true, deletedAt: true },
  });
  if (!current) return { ok: false, error: "Siswa tidak ditemukan." };
  if (current.deletedAt) return { ok: false, error: "Siswa sudah dihapus." };

  const now = new Date();
  await prisma.$transaction([
    prisma.siswa.update({
      where: { id: siswaId },
      data: { deletedAt: now },
    }),
    prisma.user.update({
      where: { id: current.userId },
      data: { deletedAt: now, status: "SUSPENDED" },
    }),
  ]);

  await logAudit({
    userId: session.user.id,
    action: "DELETE_SISWA",
    entityType: "Siswa",
    entityId: siswaId,
    metadata: { nama: current.nama },
  });

  revalidatePath("/admin/siswa");
  return { ok: true };
}

/**
 * Reset password siswa ke default (NIS atau `siswa<nis>` kalau pendek).
 * Set mustChangePassword=true supaya user dipaksa ganti saat login.
 */
export async function resetSiswaPasswordAction(
  siswaId: string,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const siswa = await prisma.siswa.findUnique({
    where: { id: siswaId },
    select: { userId: true, nis: true, nama: true },
  });
  if (!siswa) return { ok: false, error: "Siswa tidak ditemukan." };

  const raw = siswa.nis.length >= 8 ? siswa.nis : `siswa${siswa.nis}`;
  const hashed = await bcrypt.hash(raw, 10);
  await prisma.user.update({
    where: { id: siswa.userId },
    data: { password: hashed, mustChangePassword: true },
  });

  await logAudit({
    userId: session.user.id,
    action: "RESET_PASSWORD_SISWA",
    entityType: "Siswa",
    entityId: siswaId,
    metadata: { nama: siswa.nama },
  });

  return { ok: true };
}
