"use client";

/**
 * Komponen pagination untuk daftar admin.
 * Navigasi pakai Link (server-rendered page transitions).
 */

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaginationMeta } from "@/lib/pagination";

interface DataPaginationProps {
  meta: PaginationMeta;
}

export function DataPagination({ meta }: DataPaginationProps) {
  const pathname = usePathname();
  const params = useSearchParams();

  const buildHref = (page: number) => {
    const p = new URLSearchParams(params.toString());
    p.set("page", String(page));
    return `${pathname}?${p.toString()}`;
  };

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
      <div className="text-xs text-muted-foreground">
        {meta.total === 0
          ? "Tidak ada data."
          : `Menampilkan ${meta.from}–${meta.to} dari ${meta.total}`}
      </div>
      <div className="flex items-center gap-1">
        <Button
          asChild={canPrev}
          variant="outline"
          size="sm"
          disabled={!canPrev}
        >
          {canPrev ? (
            <Link href={buildHref(meta.page - 1)} aria-label="Halaman sebelumnya">
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </Link>
          ) : (
            <span>
              <ChevronLeft className="h-4 w-4" />
              Sebelumnya
            </span>
          )}
        </Button>
        <div className="px-2 text-xs text-muted-foreground">
          Hal. {meta.page} / {meta.totalPages}
        </div>
        <Button
          asChild={canNext}
          variant="outline"
          size="sm"
          disabled={!canNext}
        >
          {canNext ? (
            <Link href={buildHref(meta.page + 1)} aria-label="Halaman berikutnya">
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span>
              Berikutnya
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
