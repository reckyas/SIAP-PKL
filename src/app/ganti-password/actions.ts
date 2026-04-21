"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/auth";
import { DASHBOARD_BY_ROLE } from "@/lib/constants";

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof ChangePasswordInput, string>>;
}

/**
 * Ganti password user yang sedang login.
 *
 * Alur:
 *   1. Validasi input + pastikan user login.
 *   2. Cocokkan currentPassword dengan hash di DB.
 *   3. Hash newPassword → update + set mustChangePassword=false.
 *   4. Audit log. Force sign-out supaya JWT lama (yang mungkin masih
 *      mencerminkan state lama) diganti — user login ulang dengan pass baru.
 */
export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<ChangePasswordResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: ChangePasswordResult["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") {
        fieldErrors[key as keyof ChangePasswordInput] = issue.message;
      }
    }
    return { ok: false, error: "Input tidak valid", fieldErrors };
  }

  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Sesi tidak valid. Silakan login ulang." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true, role: true },
  });
  if (!user) {
    return { ok: false, error: "User tidak ditemukan." };
  }

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    user.password,
  );
  if (!valid) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "Password lama salah." },
    };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash, mustChangePassword: false },
  });

  await logAudit({
    userId: user.id,
    action: "PASSWORD_CHANGE",
    entityType: "User",
    entityId: user.id,
  });

  // Sign out supaya JWT lama tidak dipakai lagi. Redirect ke login.
  await signOut({ redirectTo: "/login?changed=1" });
  // signOut sudah redirect — baris di bawah tidak akan jalan, tapi untuk
  // type safety kita tetap return.
  redirect(DASHBOARD_BY_ROLE[user.role]);
}
