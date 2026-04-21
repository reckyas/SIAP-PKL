"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  guruProfilSchema,
  type GuruProfilInput,
} from "@/lib/validations/guru";

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

export async function updateGuruProfilAction(
  input: GuruProfilInput,
): Promise<MutationResult> {
  const s = await auth();
  if (!s?.user || s.user.role !== "GURU_PEMBIMBING") {
    return { ok: false, error: "Tidak berwenang." };
  }

  const parsed = guruProfilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Input tidak valid",
      fieldErrors: zodFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;
  const nip = d.nip?.trim() || null;

  const current = await prisma.guru.findUnique({
    where: { userId: s.user.id },
    select: { id: true, nip: true },
  });
  if (!current) return { ok: false, error: "Profil guru tidak ditemukan." };

  if (nip && nip !== current.nip) {
    const used = await prisma.guru.findUnique({
      where: { nip },
      select: { id: true },
    });
    if (used && used.id !== current.id) {
      return {
        ok: false,
        error: "NIP sudah terpakai",
        fieldErrors: { nip: "NIP sudah terpakai" },
      };
    }
  }

  await prisma.guru.update({
    where: { id: current.id },
    data: {
      nama: d.nama,
      nip,
      noHp: d.noHp,
      mataPelajaran: d.mataPelajaran?.trim() || null,
      fotoUrl: d.fotoUrl || null,
    },
  });

  await logAudit({
    userId: s.user.id,
    action: "UPDATE_PROFIL_GURU",
    entityType: "Guru",
    entityId: current.id,
  });

  revalidatePath("/guru/profil");
  revalidatePath("/guru");
  return { ok: true };
}
