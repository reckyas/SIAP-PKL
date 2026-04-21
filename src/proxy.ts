import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Next.js 16 "proxy" (sebelumnya "middleware").
 *
 * Sengaja pakai `authConfig` (bukan `auth` dari src/auth.ts) supaya
 * runtime edge tidak menarik dependency bcrypt/prisma.
 * File ini dulu bernama `middleware.ts`; di Next 16 konvensinya
 * berubah jadi `proxy.ts` dengan API yang sama.
 */
export const { auth } = NextAuth(authConfig);

export default auth((_req) => {
  // Callback `authorized` di authConfig sudah menangani redirect.
  return;
});

// Matcher: semua route kecuali static assets & favicon.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)"],
};
