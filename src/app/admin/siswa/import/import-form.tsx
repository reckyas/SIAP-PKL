"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importSiswaAction, type ImportRowError } from "./actions";

export function SiswaImportForm() {
  const [pending, start] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      toast.error("Pilih file .xlsx dulu.");
      return;
    }
    setServerError(null);
    setRowErrors([]);

    start(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await importSiswaAction(fd);
      if (res.ok) {
        toast.success(`Berhasil import ${res.imported} siswa.`);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
      setServerError(res.error ?? "Gagal import.");
      setRowErrors(res.rowErrors ?? []);
      toast.error(res.error ?? "Gagal import.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <a href="/admin/siswa/import/template" download>
            <Download className="h-4 w-4" />
            Unduh template
          </a>
        </Button>
        <p className="text-sm text-muted-foreground">
          Unduh template, isi sheet <strong>Siswa</strong>, lalu upload di sini.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="file">File Excel (.xlsx)</Label>
          <Input
            ref={inputRef}
            id="file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Maks 5 MB · 500 baris · password awal semua siswa{" "}
            <code>Password1234</code> (wajib ganti saat login pertama).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending || !file}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            Import
          </Button>
          {file && !pending && (
            <span className="text-xs text-muted-foreground">
              {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </span>
          )}
        </div>
      </form>

      {serverError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
          <p className="font-medium text-destructive">{serverError}</p>
          {rowErrors.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Perbaiki file lalu upload ulang. Tidak ada baris yang tersimpan.
            </p>
          )}
        </div>
      )}

      {rowErrors.length > 0 && (
        <div className="rounded-md border">
          <div className="border-b bg-muted/30 p-2 text-sm font-medium">
            Detail error ({rowErrors.length})
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Baris</TableHead>
                <TableHead className="w-[160px]">Kolom</TableHead>
                <TableHead>Pesan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rowErrors.map((e, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">{e.row}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {e.field ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{e.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
