import type { NextAuthConfig } from "next-auth";

import { DASHBOARD_BY_ROLE } from "@/lib/constants";

/**
 * Konfigurasi Auth.js v5 yang edge-safe.
 *
 * File ini TIDAK boleh import `prisma` atau `bcryptjs` — middleware
 * dijalankan di Edge Runtime yang tidak support Node API penuh.
 * Logic authorize (pakai bcrypt) ada di `src/auth.ts` yang hanya
 * dipanggil di Node runtime.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Provider dimasukkan di src/auth.ts — field ini sengaja kosong di sini
    // supaya middleware edge tidak ikut import bcrypt.
  ],
  callbacks: {
    /**
     * Dijalankan di middleware untuk cek apakah request diizinkan.
     * Return true = boleh lanjut, false = redirect ke signIn page,
     * Response = custom redirect.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role;
      const path = nextUrl.pathname;

      const isAuthPage =
        path === "/login" ||
        path === "/register" ||
        path.startsWith("/register/");
      const isPublicPage =
        path === "/" ||
        path.startsWith("/_next") ||
        path.startsWith("/api/auth");

      // Halaman public: izinkan
      if (isPublicPage) return true;

      // Halaman auth (login/register): user yang sudah login diarahkan ke dashboard
      if (isAuthPage) {
        if (isLoggedIn && role) {
          return Response.redirect(new URL(DASHBOARD_BY_ROLE[role], nextUrl));
        }
        return true;
      }

      // Selain itu: butuh login
      if (!isLoggedIn) return false;

      // Role-based area protection: cegah siswa masuk ke /admin, dll
      const allowedPrefix = role ? DASHBOARD_BY_ROLE[role] : null;
      if (
        allowedPrefix &&
        (path.startsWith("/admin") ||
          path.startsWith("/guru") ||
          path.startsWith("/siswa") ||
          path.startsWith("/dudi"))
      ) {
        if (!path.startsWith(allowedPrefix)) {
          return Response.redirect(new URL(allowedPrefix, nextUrl));
        }
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
