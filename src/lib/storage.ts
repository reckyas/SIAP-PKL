import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import type { UploadFolder } from "@/lib/constants";

/**
 * Abstraksi storage file upload.
 *
 * Implementasi milestone 2: Local disk di `public/uploads/<folder>/`.
 * Return URL public yang bisa dipakai langsung di tag <img> / <a>.
 *
 * Roadmap: ganti `LocalStorage` dengan S3/Cloudinary — kontraknya sama,
 * cukup inject via factory. Untuk sekarang kita export `storage` singleton.
 */
export interface FileStorage {
  save(
    data: ArrayBuffer | Uint8Array | Buffer,
    originalName: string,
    folder: UploadFolder,
  ): Promise<SavedFile>;
  delete(url: string): Promise<void>;
}

export interface SavedFile {
  /** Public URL (e.g. `/uploads/foto/abc123-photo.jpg`). */
  url: string;
  /** Nama file yang disimpan (bukan original). */
  filename: string;
  /** Ukuran byte. */
  size: number;
}

const PUBLIC_DIR = path.join(process.cwd(), "public");
const UPLOADS_ROOT = path.join(PUBLIC_DIR, "uploads");

/** Kumpulan MIME diizinkan + ekstensi. Whitelist untuk cegah abuse upload. */
const ALLOWED_MIME: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
  "application/pdf": [".pdf"],
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Sanitasi nama file: hanya a-z0-9._-. */
function sanitize(name: string): string {
  const lower = name.toLowerCase();
  const sanitized = lower.replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
  // Pastikan tidak kosong dan tidak terlalu panjang
  return (sanitized || "file").slice(0, 60);
}

class LocalStorage implements FileStorage {
  async save(
    data: ArrayBuffer | Uint8Array | Buffer,
    originalName: string,
    folder: UploadFolder,
  ): Promise<SavedFile> {
    const dir = path.join(UPLOADS_ROOT, folder);
    await mkdir(dir, { recursive: true });

    const cleanName = sanitize(originalName);
    const hash = randomBytes(6).toString("hex");
    const filename = `${hash}-${cleanName}`;
    const filepath = path.join(dir, filename);

    const buffer = Buffer.from(data as ArrayBuffer);
    await writeFile(filepath, buffer);

    return {
      url: `/uploads/${folder}/${filename}`,
      filename,
      size: buffer.byteLength,
    };
  }

  async delete(url: string): Promise<void> {
    // Hanya file di dalam /uploads/ yang boleh dihapus (cegah path traversal).
    if (!url.startsWith("/uploads/")) return;
    const rel = url.replace(/^\/+/, "");
    const full = path.join(PUBLIC_DIR, rel);
    // Pastikan resolve masih di dalam UPLOADS_ROOT
    const normalized = path.normalize(full);
    if (!normalized.startsWith(UPLOADS_ROOT)) return;
    await unlink(normalized).catch(() => {
      // File sudah tidak ada — abaikan
    });
  }
}

export const storage: FileStorage = new LocalStorage();

/**
 * Validasi file upload: cek MIME, ekstensi, ukuran.
 * Return error string (human-readable) atau null jika valid.
 */
export function validateUpload(
  file: File,
  opts?: { maxBytes?: number; allowedMimes?: string[] },
): string | null {
  const maxBytes = opts?.maxBytes ?? MAX_UPLOAD_BYTES;
  const allowed = opts?.allowedMimes ?? Object.keys(ALLOWED_MIME);

  if (file.size === 0) return "File kosong.";
  if (file.size > maxBytes) {
    return `Ukuran file maksimal ${(maxBytes / 1024 / 1024).toFixed(1)} MB.`;
  }
  if (!allowed.includes(file.type)) {
    return `Tipe file tidak diizinkan (${file.type || "unknown"}).`;
  }
  const extsForMime = ALLOWED_MIME[file.type] ?? [];
  const ext = path.extname(file.name).toLowerCase();
  if (extsForMime.length > 0 && !extsForMime.includes(ext)) {
    return `Ekstensi file tidak cocok dengan tipe (${ext}).`;
  }
  return null;
}
