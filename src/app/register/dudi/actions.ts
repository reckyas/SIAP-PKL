"use server";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notifyMany } from "@/lib/notifications";
import {
  registerDudiSchema,
  type RegisterDudiInput,
} from "@/lib/validations/auth";

export interface RegisterResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * Self-register DU/DI.
 *
 * - status User = PENDING → menunggu admin verifikasi di /admin/dudi-pending.
 * - Password di-hash. Tidak perlu mustChangePassword karena user set sendiri.
 * - Semua admin dikirim notifikasi pendaftaran baru.
 */
export async function registerDudiAction(
  input: RegisterDudiInput,
): Promise<RegisterResult> {
  const parsed = registerDudiSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, error: "Input tidak valid", fieldErrors };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();

  const used = await prisma.user.findUnique({
    where: { email: emailLower },
    select: { id: true },
  });
  if (used) {
    return {
      ok: false,
      error: "Email sudah terdaftar",
      fieldErrors: { email: "Email sudah terdaftar" },
    };
  }

  const hashed = await bcrypt.hash(d.password, 10);

  const created = await prisma.user.create({
    data: {
      email: emailLower,
      password: hashed,
      role: "DUDI",
      status: "PENDING",
      mustChangePassword: false,
      dudi: {
        create: {
          namaPerusahaan: d.namaPerusahaan,
          alamat: d.alamat,
          latitude: d.latitude,
          longitude: d.longitude,
          namaPIC: d.namaPIC,
          noHpPIC: d.noHpPIC,
          bidangUsaha: d.bidangUsaha,
        },
      },
    },
    select: { id: true, dudi: { select: { id: true, namaPerusahaan: true } } },
  });

  await logAudit({
    userId: created.id,
    action: "REGISTER_DUDI",
    entityType: "User",
    entityId: created.id,
    metadata: { namaPerusahaan: d.namaPerusahaan, email: emailLower },
  });

  // Kirim notifikasi ke semua admin supaya mereka tahu ada pendaftaran baru
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", deletedAt: null },
    select: { id: true },
  });
  await notifyMany(
    admins.map((a) => a.id),
    {
      type: "PENDAFTARAN_BARU",
      judul: "Pendaftaran DU/DI baru",
      pesan: `${d.namaPerusahaan} mendaftar dan menunggu verifikasi.`,
      linkUrl: "/admin/dudi-pending",
    },
  );

  return { ok: true };
}
