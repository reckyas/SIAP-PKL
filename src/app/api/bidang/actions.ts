"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { normalizeBidangNama, slugifyBidang } from "@/lib/bidang";

export interface BidangItem {
  id: string;
  nama: string;
  slug: string;
}

export interface CreateBidangResult {
  ok: boolean;
  error?: string;
  bidang?: BidangItem;
}

/**
 * Upsert bidang master. Siapapun yang login boleh menambah (Siswa isi
 * profil, DU/DI isi lowongan). Dedup by slug (lowercase), jadi "Web Dev"
 * dan "web dev" akan nyambung ke record yang sama.
 */
export async function createBidangAction(
  input: { nama: string },
): Promise<CreateBidangResult> {
  const s = await auth();
  if (!s?.user) return { ok: false, error: "Tidak berwenang." };

  const nama = normalizeBidangNama(input.nama ?? "");
  if (nama.length < 2) return { ok: false, error: "Nama minimal 2 karakter." };
  if (nama.length > 80) return { ok: false, error: "Nama terlalu panjang." };

  const slug = slugifyBidang(nama);

  const bidang = await prisma.bidang.upsert({
    where: { slug },
    create: { nama, slug },
    update: {},
    select: { id: true, nama: true, slug: true },
  });

  return { ok: true, bidang };
}
