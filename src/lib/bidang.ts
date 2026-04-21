/** Normalisasi nama bidang jadi slug: lowercase + trim + compress whitespace. */
export function slugifyBidang(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normalisasi tampilan: trim + compress whitespace (case user dibiarkan). */
export function normalizeBidangNama(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}
