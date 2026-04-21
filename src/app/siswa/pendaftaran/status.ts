import type { StatusPendaftaran } from "@prisma/client";

export const STATUS_LABEL: Record<StatusPendaftaran, string> = {
  PENDING: "Menunggu Guru",
  DISETUJUI_GURU: "Disetujui Guru",
  DITOLAK_GURU: "Ditolak Guru",
  DILIHAT_DUDI: "Dilihat DU/DI",
  DITERIMA: "Diterima",
  DITOLAK_DUDI: "Ditolak DU/DI",
  DIBATALKAN_SISWA: "Dibatalkan",
};

export const STATUS_VARIANT: Record<
  StatusPendaftaran,
  "default" | "secondary" | "outline" | "destructive"
> = {
  PENDING: "outline",
  DISETUJUI_GURU: "secondary",
  DITOLAK_GURU: "destructive",
  DILIHAT_DUDI: "secondary",
  DITERIMA: "default",
  DITOLAK_DUDI: "destructive",
  DIBATALKAN_SISWA: "outline",
};
