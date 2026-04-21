import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { DASHBOARD_BY_ROLE } from "@/lib/constants";
import type { Role } from "@prisma/client";

/**
 * Dapatkan session user atau throw ke /login.
 * Dipakai di Server Component dashboard supaya guardrail konsisten
 * bahkan kalau middleware dilewati (mis. race-condition).
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Pastikan user punya role yang diizinkan; kalau tidak, redirect ke
 * dashboard role mereka sendiri.
 */
export async function requireRole(allowed: Role[]) {
  const session = await requireSession();
  const role = session.user.role;
  if (!allowed.includes(role)) {
    redirect(DASHBOARD_BY_ROLE[role]);
  }
  return session;
}
