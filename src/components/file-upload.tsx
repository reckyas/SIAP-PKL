"use client";

/**
 * Reusable file upload component.
 *
 * Pola pakai:
 *   <FileUpload value={url} onChange={setUrl} folder="foto" accept="image/*" />
 *
 * - `value` = URL file yang sudah tersimpan (kalau ada).
 * - `onChange(null)` dipanggil saat user hapus, `onChange(url)` saat upload sukses.
 * - Upload lewat POST /api/upload (butuh login). Progress pakai `fetch`
 *   sederhana — kalau nanti butuh progress bar upload, ganti ke XHR.
 */

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { UploadCloud, X, Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { UploadFolder } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: UploadFolder;
  /** HTML `accept` attribute, e.g. "image/*" atau ".pdf". */
  accept?: string;
  /** Mode preview: image menampilkan <img>, file menampilkan nama + icon. */
  variant?: "image" | "file";
  disabled?: boolean;
  /** Label tombol upload (default: "Pilih file"). */
  buttonLabel?: string;
  className?: string;
}

interface UploadResponse {
  url?: string;
  filename?: string;
  size?: number;
  error?: string;
}

export function FileUpload({
  value,
  onChange,
  folder,
  accept,
  variant = "image",
  disabled,
  buttonLabel = "Pilih file",
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, startUpload] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset value supaya user bisa pilih file yang sama lagi setelah hapus
    e.target.value = "";
    if (!file) return;

    setLocalError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = (await res.json().catch(() => ({}))) as UploadResponse;
        if (!res.ok || !json.url) {
          const msg = json.error ?? "Upload gagal.";
          setLocalError(msg);
          toast.error(msg);
          return;
        }
        onChange(json.url);
        toast.success("File berhasil diunggah.");
      } catch {
        const msg = "Koneksi gagal saat upload.";
        setLocalError(msg);
        toast.error(msg);
      }
    });
  }

  function handleRemove() {
    onChange(null);
    setLocalError(null);
  }

  const hasValue = Boolean(value);
  const fileName = value ? value.split("/").pop() ?? "" : "";

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleSelect}
        disabled={disabled || uploading}
      />

      {hasValue && variant === "image" && value ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Preview"
            className="h-32 w-32 rounded-md border object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow hover:bg-accent"
              aria-label="Hapus file"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : hasValue && variant === "file" ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <a
            href={value ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="flex-1 truncate hover:underline"
          >
            {fileName || "Lihat file"}
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Hapus file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : null}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openPicker}
          disabled={disabled || uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}
          {hasValue ? "Ganti file" : buttonLabel}
        </Button>
      </div>

      {localError && (
        <p className="text-xs text-destructive">{localError}</p>
      )}
    </div>
  );
}
