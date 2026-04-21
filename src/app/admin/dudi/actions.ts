"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  createDudiByAdminSchema,
  type CreateDudiByAdminInput,
} from "@/lib/validations/dudi";

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

function zodFieldErrors(err: import("zod").ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}

const DEFAULT_PASSWORD = "dudi12345";

/**
 * Admin menambahkan DUDI.
 *
 * Berbeda dengan self-register:
 * - Status langsung VERIFIED (sekolah sudah tahu perusahaannya).
 * - mustChangePassword = true agar DU/DI ganti password saat login pertama.
 */
export async function createDudiByAdminAction(
  input: CreateDudiByAdminInput,
): Promise<MutationResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };

  const parsed = createDudiByAdminSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const emailLower = d.email.toLowerCase();

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

  const rawPassword =
    d.passwordAwal && d.passwordAwal.length >= 8
      ? d.passwordAwal
      : DEFAULT_PASSWORD;
  const hashed = await bcrypt.hash(rawPassword, 10);

  const websiteUrl = d.websiteUrl?.trim() || null;

  const created = await prisma.user.create({
    data: {
      email: emailLower,
      password: hashed,
      role: "DUDI",
      status: "VERIFIED",
      mustChangePassword: true,
      dudi: {
        create: {
          namaPerusahaan: d.namaPerusahaan,
          alamat: d.alamat,
          latitude: d.latitude,
          longitude: d.longitude,
          namaPIC: d.namaPIC,
          noHpPIC: d.noHpPIC,
          websiteUrl,
          bidangUsaha: d.bidangUsaha,
        },
      },
    },
    select: { id: true, dudi: { select: { id: true } } },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE_DUDI_BY_ADMIN",
    entityType: "DUDI",
    entityId: created.dudi?.id ?? null,
    metadata: { email: emailLower, namaPerusahaan: d.namaPerusahaan },
  });

  revalidatePath("/admin/dudi");
  return { ok: true, id: created.dudi?.id };
}
