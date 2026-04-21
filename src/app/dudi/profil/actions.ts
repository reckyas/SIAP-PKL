"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  dudiProfilSchema,
  type DudiProfilInput,
} from "@/lib/validations/dudi";

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

export async function updateDudiProfilAction(
  input: DudiProfilInput,
): Promise<MutationResult> {
  const s = await auth();
  if (!s?.user || s.user.role !== "DUDI") {
    return { ok: false, error: "Tidak berwenang." };
  }

  const parsed = dudiProfilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const current = await prisma.dUDI.findUnique({
    where: { userId: s.user.id },
    select: { id: true },
  });
  if (!current) return { ok: false, error: "Profil DU/DI tidak ditemukan." };

  await prisma.dUDI.update({
    where: { id: current.id },
    data: {
      namaPerusahaan: d.namaPerusahaan,
      deskripsi: d.deskripsi?.trim() || null,
      logoUrl: d.logoUrl || null,
      websiteUrl: d.websiteUrl?.trim() || null,
      alamat: d.alamat,
      latitude: d.latitude,
      longitude: d.longitude,
      namaPIC: d.namaPIC,
      jabatanPIC: d.jabatanPIC?.trim() || null,
      noHpPIC: d.noHpPIC,
      emailPIC: d.emailPIC?.trim() || null,
      bidangUsaha: d.bidangUsaha,
      fotoUrls: d.fotoUrls,
    },
  });

  await logAudit({
    userId: s.user.id,
    action: "UPDATE_PROFIL_DUDI",
    entityType: "DUDI",
    entityId: current.id,
  });

  revalidatePath("/dudi/profil");
  revalidatePath("/dudi");
  return { ok: true };
}
