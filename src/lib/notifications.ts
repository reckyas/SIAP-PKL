import "server-only";

import type { NotificationType, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/**
 * Buat notifikasi untuk 1 user. Failure di-swallow seperti audit log —
 * notifikasi adalah side-effect, tidak boleh memblok operasi utama.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  judul: string;
  pesan: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        judul: params.judul,
        pesan: params.pesan,
        linkUrl: params.linkUrl ?? null,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (err) {
    console.error("[notify] gagal simpan notifikasi:", err);
  }
}

/** Notifikasi ke banyak user sekaligus (createMany). */
export async function notifyMany(
  userIds: string[],
  params: Omit<Parameters<typeof notify>[0], "userId">,
) {
  if (userIds.length === 0) return;
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type: params.type,
        judul: params.judul,
        pesan: params.pesan,
        linkUrl: params.linkUrl ?? null,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : undefined,
      })),
    });
  } catch (err) {
    console.error("[notify] gagal simpan batch notifikasi:", err);
  }
}
