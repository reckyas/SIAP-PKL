"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  kelasSchema,
  type KelasInput,
  type TingkatInput,
} from "@/lib/validations/kelas";
import { createKelasAction, updateKelasAction } from "./actions";

const TINGKAT_OPTIONS: TingkatInput[] = ["X", "XI", "XII", "XIII"];

export interface KelasDialogData {
  id: string;
  nama: string;
  tingkat: TingkatInput;
  jurusanId: string;
}

interface KelasDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  data?: KelasDialogData;
  jurusan: { id: string; kode: string; nama: string }[];
}

export function KelasDialog({
  open,
  onOpenChange,
  mode,
  data,
  jurusan,
}: KelasDialogProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<KelasInput>({
    resolver: zodResolver(kelasSchema),
    defaultValues: {
      nama: data?.nama ?? "",
      tingkat: data?.tingkat ?? "X",
      jurusanId: data?.jurusanId ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nama: data?.nama ?? "",
        tingkat: data?.tingkat ?? "X",
        jurusanId: data?.jurusanId ?? "",
      });
      setServerError(null);
    }
  }, [open, data, reset]);

  function onSubmit(values: KelasInput) {
    start(async () => {
      const res =
        mode === "create"
          ? await createKelasAction(values)
          : await updateKelasAction(data!.id, values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof KelasInput, { type: "server", message: msg });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Kelas ditambahkan." : "Kelas diperbarui.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Kelas" : "Edit Kelas"}
          </DialogTitle>
          <DialogDescription>
            Kelas terhubung ke jurusan & tingkat. Nama unik dalam kombinasi
            jurusan + tingkat (mis. <code>XI RPL 1</code>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="space-y-1">
            <Label>Jurusan</Label>
            <Controller
              control={control}
              name="jurusanId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jurusan…" />
                  </SelectTrigger>
                  <SelectContent>
                    {jurusan.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.kode} — {j.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.jurusanId && (
              <p className="text-xs text-destructive">
                {errors.jurusanId.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label>Tingkat</Label>
            <Controller
              control={control}
              name="tingkat"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih tingkat…" />
                  </SelectTrigger>
                  <SelectContent>
                    {TINGKAT_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.tingkat && (
              <p className="text-xs text-destructive">
                {errors.tingkat.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="nama">Nama kelas</Label>
            <Input
              id="nama"
              placeholder="Mis. RPL 1"
              {...register("nama")}
            />
            {errors.nama && (
              <p className="text-xs text-destructive">{errors.nama.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
