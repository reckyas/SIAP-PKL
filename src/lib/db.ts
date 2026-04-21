import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton.
 *
 * Di dev Next.js melakukan hot-reload yang bisa bikin banyak instance
 * PrismaClient menumpuk di koneksi DB. Kita simpan di globalThis
 * supaya instance tetap satu selama proses Node sama.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
