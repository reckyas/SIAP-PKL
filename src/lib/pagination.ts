/**
 * Helper pagination server-side untuk halaman daftar admin.
 *
 * Pola pakai di Server Component:
 *   const sp = await searchParams;
 *   const p = parsePagination(sp);
 *   const total = await prisma.x.count({ where });
 *   const items = await prisma.x.findMany({ where, ...paginateArgs(p) });
 *   <Pagination meta={paginationMeta(p, total)} baseUrl="/admin/x" />
 */

export interface PaginationInput {
  page: number;
  pageSize: number;
  q: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  q: string;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

export function parsePagination(
  sp: Record<string, string | string[] | undefined>,
  opts?: { defaultSize?: number },
): PaginationInput {
  const pageRaw = firstValue(sp.page);
  const sizeRaw = firstValue(sp.size);
  const qRaw = firstValue(sp.q);

  const page = Math.max(1, parseIntOr(pageRaw, 1));
  const pageSize = clamp(
    parseIntOr(sizeRaw, opts?.defaultSize ?? DEFAULT_PAGE_SIZE),
    1,
    MAX_PAGE_SIZE,
  );
  const q = (qRaw ?? "").trim().slice(0, 100);

  return { page, pageSize, q };
}

export function paginateArgs(p: PaginationInput) {
  return {
    take: p.pageSize,
    skip: (p.page - 1) * p.pageSize,
  };
}

export function paginationMeta(
  p: PaginationInput,
  total: number,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(total / p.pageSize));
  const from = total === 0 ? 0 : (p.page - 1) * p.pageSize + 1;
  const to = Math.min(total, p.page * p.pageSize);
  return {
    page: p.page,
    pageSize: p.pageSize,
    total,
    totalPages,
    from,
    to,
    q: p.q,
  };
}

function firstValue(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseIntOr(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
