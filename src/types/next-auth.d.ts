import type { Role, AccountStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

/**
 * Augmentasi tipe Auth.js supaya session.user.role dan status
 * type-safe di seluruh aplikasi (server & client).
 *
 * Catatan: v5 merujuk JWT type ke `@auth/core/jwt` — kita augment
 * kedua module supaya bekerja di runtime v5 maupun fallback v4-style.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      status: AccountStatus;
      name?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: Role;
    status: AccountStatus;
    name?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    name?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    status: AccountStatus;
    name?: string | null;
  }
}
