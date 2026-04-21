"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

/**
 * Approve akun DU/DI. Mengubah User.status → VERIFIED.
 * Notifikasi & audit log diterbitkan. Non-blocking.
 */
export async function approveDudiAction(
  userId: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  if (!userId) return { ok: false, error: "ID user kosong." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, dudi: { select: { namaPerusahaan: true } } },
  });
  if (!target || target.role !== "DUDI") {
    return { ok: false, error: "User DU/DI tidak ditemukan." };
  }
  if (target.status === "VERIFIED") {
    return { ok: false, error: "Akun sudah diverifikasi." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: "VERIFIED" },
  });

  await logAudit({
    userId: session.user.id,
    action: "VERIFY_DUDI",
    entityType: "User",
    entityId: userId,
    metadata: { namaPerusahaan: target.dudi?.namaPerusahaan ?? null },
  });

  await notify({
    userId,
    type: "SISTEM",
    judul: "Akun DU/DI diverifikasi",
    pesan:
      "Akun perusahaan Anda telah disetujui oleh admin. Anda sudah bisa menggunakan fitur lengkap.",
    linkUrl: "/dudi",
  });

  revalidatePath("/admin/dudi-pending");
  revalidatePath("/admin/dudi");
  return { ok: true };
}

/**
 * Reject akun DU/DI. User.status → REJECTED.
 * Pesan reject boleh diisi oleh admin (alasan).
 */
export async function rejectDudiAction(
  userId: string,
  alasan?: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "Tidak berwenang." };
  if (!userId) return { ok: false, error: "ID user kosong." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, dudi: { select: { namaPerusahaan: true } } },
  });
  if (!target || target.role !== "DUDI") {
    return { ok: false, error: "User DU/DI tidak ditemukan." };
  }

  const note = (alasan ?? "").trim().slice(0, 500);

  await prisma.user.update({
    where: { id: userId },
    data: { status: "REJECTED" },
  });

  await logAudit({
    userId: session.user.id,
    action: "REJECT_DUDI",
    entityType: "User",
    entityId: userId,
    metadata: {
      namaPerusahaan: target.dudi?.namaPerusahaan ?? null,
      alasan: note || null,
    },
  });

  await notify({
    userId,
    type: "SISTEM",
    judul: "Akun DU/DI ditolak",
    pesan: note
      ? `Pendaftaran Anda ditolak oleh admin. Alasan: ${note}`
      : "Pendaftaran Anda ditolak oleh admin. Silakan hubungi sekolah untuk informasi lebih lanjut.",
  });

  revalidatePath("/admin/dudi-pending");
  revalidatePath("/admin/dudi");
  return { ok: true };
}
