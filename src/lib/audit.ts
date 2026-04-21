import "server-only";

import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Catat aksi ke AuditLog.
 *
 * Dipanggil dari server action/route handler tiap kali terjadi mutasi
 * penting (verifikasi user, CRUD master data, set bobot SAW, dll).
 *
 * Tidak throw — jika insert gagal, log ke console. Audit tidak boleh
 * memblok operasi bisnis.
 */
export async function logAudit(params: {
  userId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const h = await headers();
    const ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const userAgent = h.get("user-agent") ?? null;

    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] gagal simpan log:", err);
  }
}
