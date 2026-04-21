"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  adminProfilSchema,
  type AdminProfilInput,
} from "@/lib/validations/admin";

export interface MutationResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
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

export async function updateAdminProfilAction(
  input: AdminProfilInput,
): Promise<MutationResult> {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return { ok: false, error: "Tidak berwenang." };
  }

  const parsed = adminProfilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const nip = d.nip?.trim() || null;

  if (nip) {
    const used = await prisma.admin.findUnique({
      where: { nip },
      select: { userId: true },
    });
    if (used && used.userId !== s.user.id) {
      return {
        ok: false,
        error: "NIP sudah terpakai",
        fieldErrors: { nip: "NIP sudah terpakai" },
      };
    }
  }

  await prisma.admin.upsert({
    where: { userId: s.user.id },
    update: {
      nama: d.nama,
      jabatan: d.jabatan?.trim() || null,
      nip,
      noHp: d.noHp?.trim() || null,
      fotoUrl: d.fotoUrl || null,
    },
    create: {
      userId: s.user.id,
      nama: d.nama,
      jabatan: d.jabatan?.trim() || null,
      nip,
      noHp: d.noHp?.trim() || null,
      fotoUrl: d.fotoUrl || null,
    },
  });

  await logAudit({
    userId: s.user.id,
    action: "UPDATE_PROFIL_ADMIN",
    entityType: "Admin",
    entityId: s.user.id,
  });

  revalidatePath("/admin/profil");
  revalidatePath("/admin");
  return { ok: true };
}
