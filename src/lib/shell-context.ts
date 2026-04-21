import "server-only";

import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

/**
 * Data minimal yang dibutuhkan AppShell (sidebar + user menu):
 * nama tampilan, email, dan URL foto/logo kalau ada.
 *
 * Dipisah dari session supaya kita tidak perlu menggemukkan JWT dengan
 * data yang bisa berubah sering (nama/foto profil).
 */
export interface ShellContext {
  name: string;
  email: string;
  avatarUrl: string | null;
  mustChangePassword: boolean;
}

export async function getShellContext(
  userId: string,
  role: Role,
): Promise<ShellContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      mustChangePassword: true,
      admin: { select: { nama: true, fotoUrl: true } },
      guru: { select: { nama: true, fotoUrl: true } },
      siswa: { select: { nama: true, fotoUrl: true } },
      dudi: { select: { namaPerusahaan: true, logoUrl: true } },
    },
  });

  if (!user) {
    return {
      name: "",
      email: "",
      avatarUrl: null,
      mustChangePassword: false,
    };
  }

  let name = user.email;
  let avatarUrl: string | null = null;

  switch (role) {
    case "ADMIN":
      name = user.admin?.nama ?? user.email;
      avatarUrl = user.admin?.fotoUrl ?? null;
      break;
    case "GURU_PEMBIMBING":
      name = user.guru?.nama ?? user.email;
      avatarUrl = user.guru?.fotoUrl ?? null;
      break;
    case "SISWA":
      name = user.siswa?.nama ?? user.email;
      avatarUrl = user.siswa?.fotoUrl ?? null;
      break;
    case "DUDI":
      name = user.dudi?.namaPerusahaan ?? user.email;
      avatarUrl = user.dudi?.logoUrl ?? null;
      break;
  }

  return {
    name,
    email: user.email,
    avatarUrl,
    mustChangePassword: user.mustChangePassword,
  };
}
