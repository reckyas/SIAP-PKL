"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  sawWeightSchema,
  type SAWWeightInput,
} from "@/lib/validations/saw";
import {
  createSAWWeightAction,
  updateSAWWeightAction,
} from "./actions";

const GLOBAL = "__GLOBAL__";

export interface SAWDialogData {
  id: string;
  nama: string;
  jurusanId: string | null;
  isActive: boolean;
  bobotBidang: number;
  bobotJarak: number;
  bobotKuota: number;
  bobotKeahlian: number;
  bobotDokumen: number;
  bobotFasilitas: number;
  bobotRating: number;
}

interface SAWDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  data?: SAWDialogData;
  jurusan: { id: string; kode: string; nama: string }[];
}

const DEFAULT_VALUES: SAWWeightInput = {
  nama: "Default",
  jurusanId: null,
  isActive: false,
  bobotBidang: 0.25,
  bobotJarak: 0.15,
  bobotKuota: 0.1,
  bobotKeahlian: 0.2,
  bobotDokumen: 0.1,
  bobotFasilitas: 0.1,
  bobotRating: 0.1,
};

const FIELDS: { name: keyof SAWWeightInput; label: string; hint?: string }[] = [
  { name: "bobotBidang", label: "Bidang", hint: "Kesesuaian bidang minat" },
  { name: "bobotJarak", label: "Jarak", hint: "km rumah ke DU/DI" },
  { name: "bobotKuota", label: "Kuota", hint: "Sisa kuota lowongan" },
  {
    name: "bobotKeahlian",
    label: "Keahlian",
    hint: "Coverage keahlian siswa",
  },
  {
    name: "bobotDokumen",
    label: "Dokumen",
    hint: "Kelengkapan dokumen wajib",
  },
  {
    name: "bobotFasilitas",
    label: "Fasilitas",
    hint: "Uang saku / makan / transport",
  },
  { name: "bobotRating", label: "Rating", hint: "Rating DU/DI" },
];

export function SAWDialog({
  open,
  onOpenChange,
  mode,
  data,
  jurusan,
}: SAWDialogProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setError,
    formState: { errors },
  } = useForm<SAWWeightInput>({
    resolver: zodResolver(sawWeightSchema),
    defaultValues: data
      ? {
          nama: data.nama,
          jurusanId: data.jurusanId,
          isActive: data.isActive,
          bobotBidang: data.bobotBidang,
          bobotJarak: data.bobotJarak,
          bobotKuota: data.bobotKuota,
          bobotKeahlian: data.bobotKeahlian,
          bobotDokumen: data.bobotDokumen,
          bobotFasilitas: data.bobotFasilitas,
          bobotRating: data.bobotRating,
        }
      : DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      reset(
        data
          ? {
              nama: data.nama,
              jurusanId: data.jurusanId,
              isActive: data.isActive,
              bobotBidang: data.bobotBidang,
              bobotJarak: data.bobotJarak,
              bobotKuota: data.bobotKuota,
              bobotKeahlian: data.bobotKeahlian,
              bobotDokumen: data.bobotDokumen,
              bobotFasilitas: data.bobotFasilitas,
              bobotRating: data.bobotRating,
            }
          : DEFAULT_VALUES,
      );
      setServerError(null);
    }
  }, [open, data, reset]);

  const values = watch();
  const sum =
    (values.bobotBidang ?? 0) +
    (values.bobotJarak ?? 0) +
    (values.bobotKuota ?? 0) +
    (values.bobotKeahlian ?? 0) +
    (values.bobotDokumen ?? 0) +
    (values.bobotFasilitas ?? 0) +
    (values.bobotRating ?? 0);
  const sumValid = Math.abs(sum - 1) < 0.001;

  function onSubmit(input: SAWWeightInput) {
    setServerError(null);
    start(async () => {
      const res =
        mode === "create"
          ? await createSAWWeightAction(input)
          : await updateSAWWeightAction(data!.id, input);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof SAWWeightInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Bobot SAW disimpan." : "Bobot SAW diperbarui.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Bobot SAW baru" : "Edit bobot SAW"}
          </DialogTitle>
          <DialogDescription>
            Total 7 bobot harus sama dengan 1.0. Satu bobot aktif per jurusan
            (plus satu bobot global berlaku untuk semua).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="nama">Nama preset</Label>
              <Input
                id="nama"
                placeholder="Mis. Default RPL"
                {...register("nama")}
              />
              {errors.nama && (
                <p className="text-xs text-destructive">
                  {errors.nama.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Jurusan</Label>
              <Controller
                control={control}
                name="jurusanId"
                render={({ field }) => (
                  <Select
                    value={field.value ?? GLOBAL}
                    onValueChange={(v) =>
                      field.onChange(v === GLOBAL ? null : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={GLOBAL}>
                        Global (semua jurusan)
                      </SelectItem>
                      {jurusan.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.kode} — {j.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FIELDS.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={f.name} className="text-xs">
                  {f.label}
                </Label>
                <Input
                  id={f.name}
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  {...register(f.name, { valueAsNumber: true })}
                />
                {f.hint && (
                  <p className="text-[10px] text-muted-foreground">{f.hint}</p>
                )}
                {errors[f.name] && (
                  <p className="text-xs text-destructive">
                    {errors[f.name]?.message as string}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div
            className={`rounded-md border p-3 text-sm ${
              sumValid
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
            Total bobot: <strong>{sum.toFixed(3)}</strong>{" "}
            {sumValid ? "✓" : "(harus 1.000)"}
          </div>

          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="isActive">
                  Aktifkan preset ini
                  <span className="ml-1 text-xs text-muted-foreground">
                    (akan menonaktifkan preset lain di scope yang sama)
                  </span>
                </Label>
              </div>
            )}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending || !sumValid}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
