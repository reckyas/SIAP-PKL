"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ASPEK_PENILAIAN,
  hitungRataRata,
  penilaianSchema,
  type PenilaianInput,
} from "@/lib/validations/penilaian";

export interface PenilaianFormDefaults {
  siswaId: string;
  nilaiKedisiplinan: number;
  nilaiKeterampilan: number;
  nilaiKerjasama: number;
  nilaiInisiatif: number;
  nilaiTanggungJawab: number;
  catatan: string;
}

export interface PenilaianActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

interface PenilaianFormProps {
  defaults: PenilaianFormDefaults;
  mode: "create" | "edit";
  action: (input: PenilaianInput) => Promise<PenilaianActionResult>;
  redirectPath: string;
}

export function PenilaianForm({
  defaults,
  mode,
  action,
  redirectPath,
}: PenilaianFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<PenilaianInput>({
    resolver: zodResolver(penilaianSchema),
    defaultValues: defaults,
  });

  const watched = watch();
  const rataRata = hitungRataRata({
    nilaiKedisiplinan: Number(watched.nilaiKedisiplinan) || 0,
    nilaiKeterampilan: Number(watched.nilaiKeterampilan) || 0,
    nilaiKerjasama: Number(watched.nilaiKerjasama) || 0,
    nilaiInisiatif: Number(watched.nilaiInisiatif) || 0,
    nilaiTanggungJawab: Number(watched.nilaiTanggungJawab) || 0,
  });

  function onSubmit(values: PenilaianInput) {
    setServerError(null);
    start(async () => {
      const res = await action(values);
      if (res.ok) {
        toast.success(
          mode === "create" ? "Penilaian tersimpan." : "Penilaian diperbarui.",
        );
        router.push(redirectPath);
        router.refresh();
      } else {
        setServerError(res.error ?? "Gagal menyimpan.");
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof PenilaianInput, { message: msg });
          }
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" {...register("siswaId")} />

      <div className="grid gap-3 sm:grid-cols-2">
        {ASPEK_PENILAIAN.map((a) => (
          <div key={a.key} className="space-y-1.5">
            <Label htmlFor={a.key}>{a.label} (0-100)</Label>
            <Input
              id={a.key}
              type="number"
              min={0}
              max={100}
              step={1}
              {...register(a.key, { valueAsNumber: true })}
            />
            {errors[a.key] && (
              <p className="text-xs text-destructive">
                {errors[a.key]?.message}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
        <span className="text-muted-foreground">Rata-rata: </span>
        <span className="font-mono font-semibold">{rataRata.toFixed(2)}</span>
      </div>

      <div className="space-y-2">
        <Label htmlFor="catatan">Catatan (opsional)</Label>
        <Textarea
          id="catatan"
          rows={4}
          placeholder="Umpan balik untuk siswa: kekuatan, hal yg perlu diperbaiki, dll."
          {...register("catatan")}
        />
        {errors.catatan && (
          <p className="text-xs text-destructive">
            {errors.catatan.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Simpan penilaian" : "Simpan perubahan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
