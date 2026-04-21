"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { markPendaftaranDilihatAction } from "../actions";

/**
 * Client-side effect yg memanggil server action untuk menandai pendaftaran
 * sebagai DILIHAT_DUDI ketika DUDI membuka halaman detail. Idempotent di
 * server (tidak apa-apa kalau dipanggil berkali-kali).
 */
export function MarkDilihatEffect({
  pendaftaranId,
}: {
  pendaftaranId: string;
}) {
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    void markPendaftaranDilihatAction(pendaftaranId).then((res) => {
      if (res.ok) router.refresh();
    });
  }, [pendaftaranId, router]);

  return null;
}
