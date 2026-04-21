import "server-only";

import type { LogbookStatus } from "@prisma/client";

/**
 * Label + badge variant untuk status Logbook.
 * Dipakai di list/detail logbook lintas role.
 */

export const LOGBOOK_STATUS_LABEL: Record<LogbookStatus, string> = {
  DRAFT: "Draf",
  SUBMITTED: "Menunggu review",
  REVIEWED: "Disetujui guru",
  REVISED: "Perlu revisi",
};

export const LOGBOOK_STATUS_VARIANT: Record<
  LogbookStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  REVIEWED: "default",
  REVISED: "destructive",
};
