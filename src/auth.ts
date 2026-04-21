import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Auth.js v5 instance lengkap untuk runtime Node.
 *
 * Sengaja dipisah dari auth.config.ts karena:
 *  - Middleware jalan di Edge Runtime → tidak bisa import bcrypt/prisma.
 *  - API route & Server Component jalan di Node → pakai file ini.
 *
 * Strategy: JWT (wajib untuk Credentials provider di v5).
 * User lookup dilakukan manual di `authorize()` — tanpa PrismaAdapter
 * karena adapter tidak dipakai saat strategy JWT + Credentials.
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validasi input — jangan trust raw credentials
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            siswa: { select: { nama: true } },
            guru: { select: { nama: true } },
            dudi: { select: { namaPerusahaan: true } },
            admin: { select: { nama: true } },
          },
        });

        // Soft-deleted user tidak boleh login
        if (!user || user.deletedAt) return null;
        if (user.status === "REJECTED" || user.status === "SUSPENDED") {
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        // Update lastLoginAt secara async — tidak blokir login
        prisma.user
          .update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          .catch(() => {
            // swallow — logging non-critical
          });

        // Resolve display name dari profile sesuai role
        const name =
          user.siswa?.nama ??
          user.guru?.nama ??
          user.admin?.nama ??
          user.dudi?.namaPerusahaan ??
          user.email;

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          name,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      // `user` hanya ada saat pertama kali sign-in; selanjutnya token di-rehydrate
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.name = token.name ?? null;
      }
      return session;
    },
  },
});
