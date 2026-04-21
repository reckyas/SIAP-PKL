"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { DASHBOARD_BY_ROLE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export type LoginState = {
  ok: boolean;
  error?: string;
  redirectTo?: string;
};

/**
 * Server Action untuk proses login.
 *
 * Alur:
 *  1. Validasi input via zod.
 *  2. Cek status akun (PENDING/SUSPENDED ditolak dengan pesan jelas,
 *     bukan digabung ke "email/password salah" — ini UX demi kejelasan;
 *     di milestone 1 trade-off dengan enumeration risk dinilai acceptable
 *     karena ini sistem internal sekolah).
 *  3. signIn via Auth.js → pakai redirect:false supaya kita kendalikan
 *     redirect berdasarkan role.
 */
export async function loginAction(input: LoginInput): Promise<LoginState> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Input tidak valid." };
  }

  const { email, password } = parsed.data;
  const emailNorm = email.toLowerCase();

  // Cek status akun dulu supaya user dapat pesan tepat
  const user = await prisma.user.findUnique({
    where: { email: emailNorm },
    select: { status: true, role: true, deletedAt: true },
  });
  if (user?.deletedAt) {
    return { ok: false, error: "Akun tidak ditemukan." };
  }
  if (user?.status === "PENDING") {
    return {
      ok: false,
      error:
        "Akun Anda masih menunggu verifikasi admin. Silakan hubungi pihak sekolah.",
    };
  }
  if (user?.status === "SUSPENDED") {
    return {
      ok: false,
      error: "Akun Anda dinonaktifkan. Hubungi admin.",
    };
  }
  if (user?.status === "REJECTED") {
    return {
      ok: false,
      error: "Pendaftaran Anda ditolak. Hubungi admin.",
    };
  }

  try {
    await signIn("credentials", {
      email: emailNorm,
      password,
      redirect: false,
    });
  } catch (err) {
    // AuthError tipe "CredentialsSignin" = email/password salah
    if (err instanceof AuthError) {
      return {
        ok: false,
        error: "Email atau password salah.",
      };
    }
    throw err;
  }

  return {
    ok: true,
    redirectTo: user?.role ? DASHBOARD_BY_ROLE[user.role] : "/",
  };
}
