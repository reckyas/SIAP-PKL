import type { Role } from "@prisma/client";

/**
 * Path dashboard per-role. Dipakai middleware & post-login redirect
 * supaya routing role-based konsisten di satu tempat.
 */
export const DASHBOARD_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  GURU_PEMBIMBING: "/guru",
  SISWA: "/siswa",
  DUDI: "/dudi",
};

/** Label human-readable per-role untuk UI. */
export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  GURU_PEMBIMBING: "Guru Pembimbing",
  SISWA: "Siswa",
  DUDI: "DU/DI (Perusahaan)",
};

/**
 * Role yang boleh self-register lewat halaman /register publik.
 * SISWA & GURU dibuat langsung oleh admin — tidak ada self-register.
 */
export const SELF_REGISTRABLE_ROLES: Role[] = ["DUDI"];

/** Path untuk halaman ganti-password wajib (first-login). */
export const CHANGE_PASSWORD_PATH = "/ganti-password";

/** Folder upload lokal (di-map dari /public). Tiap sub-folder per tipe aset. */
export const UPLOAD_FOLDERS = {
  foto: "foto",
  logo: "logo",
  dokumen: "dokumen",
  gallery: "gallery",
} as const;
export type UploadFolder = keyof typeof UPLOAD_FOLDERS;
