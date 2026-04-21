"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  logbookEntrySchema,
  type LogbookEntryInput,
} from "@/lib/validations/logbook";
import { createLogbookAction, updateLogbookAction } from "./actions";

export interface LogbookFormDefaults {
  id?: string;
  tanggal: Date | null;
  kegiatan: string;
  kendala: string;
  lampiranUrlsText: string; // multi-line textarea: 1 URL per baris
}

export const BLANK_LOGBOOK: LogbookFormDefaults = {
  tanggal: null,
  kegiatan: "",
  kendala: "",
  lampiranUrlsText: "",
};

interface LogbookFormProps {
  mode: "create" | "edit";
  defaults?: LogbookFormDefaults;
}

function toDateInput(d: Date | null): string {
  if (!d) return "";
  // Format YYYY-MM-DD untuk <input type="date">.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLampiran(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function LogbookForm({
  mode,
  defaults = BLANK_LOGBOOK,
}: LogbookFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const resolverDefaults = useMemo<LogbookEntryInput>(
    () => ({
      id: defaults.id,
      tanggal: defaults.tanggal ?? new Date(),
      kegiatan: defaults.kegiatan,
      kendala: defaults.kendala,
      lampiranUrls: parseLampiran(defaults.lampiranUrlsText),
    }),
    [defaults],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors },
  } = useForm<LogbookEntryInput>({
    resolver: zodResolver(logbookEntrySchema),
    defaultValues: resolverDefaults,
  });

  const [lampiranText, setLampiranText] = useState(defaults.lampiranUrlsText);
  const tanggalValue = watch("tanggal");

  function onSubmit(values: LogbookEntryInput) {
    setServerError(null);
    const payload: LogbookEntryInput = {
      ...values,
      id: defaults.id,
      lampiranUrls: parseLampiran(lampiranText),
    };

    start(async () => {
      const res =
        mode === "create"
          ? await createLogbookAction(payload)
          : await updateLogbookAction(payload);
      if (res.ok) {
        toast.success(
          mode === "create" ? "Logbook tersimpan." : "Logbook diperbarui.",
        );
        if (res.data) {
          router.push(`/siswa/logbook/${res.data.id}`);
        } else {
          router.push("/siswa/logbook");
        }
        router.refresh();
      } else {
        setServerError(res.error ?? "Gagal menyimpan.");
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof LogbookEntryInput, { message: msg });
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

      <div className="space-y-2">
        <Label htmlFor="tanggal">Tanggal</Label>
        <Input
          id="tanggal"
          type="date"
          value={toDateInput(tanggalValue ?? null)}
          onChange={(e) => {
            const v = e.target.value;
            setValue("tanggal", v ? new Date(v) : (null as unknown as Date), {
              shouldValidate: true,
            });
          }}
        />
        {errors.tanggal && (
          <p className="text-xs text-destructive">
            {errors.tanggal.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="kegiatan">Kegiatan hari ini</Label>
        <Textarea
          id="kegiatan"
          rows={6}
          placeholder="Jelaskan apa yang Anda kerjakan hari ini…"
          {...register("kegiatan")}
        />
        {errors.kegiatan && (
          <p className="text-xs text-destructive">
            {errors.kegiatan.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="kendala">Kendala (opsional)</Label>
        <Textarea
          id="kendala"
          rows={3}
          placeholder="Kesulitan atau hambatan yang Anda temui."
          {...register("kendala")}
        />
        {errors.kendala && (
          <p className="text-xs text-destructive">
            {errors.kendala.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lampiran">Lampiran (opsional)</Label>
        <Textarea
          id="lampiran"
          rows={3}
          placeholder={"https://drive.google.com/…\nhttps://…"}
          value={lampiranText}
          onChange={(e) => setLampiranText(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Tempel URL (Google Drive, foto, dll). 1 URL per baris, maks 10.
        </p>
        {errors.lampiranUrls && (
          <p className="text-xs text-destructive">
            {errors.lampiranUrls.message}
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Simpan draf" : "Simpan perubahan"}
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
