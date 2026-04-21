"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import {
  jurusanSchema,
  type JurusanInput,
} from "@/lib/validations/master";
import { createJurusanAction, updateJurusanAction } from "./actions";

export interface JurusanDialogData {
  id: string;
  kode: string;
  nama: string;
  deskripsi: string;
}

interface JurusanDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  data?: JurusanDialogData;
}

export function JurusanDialog({
  open,
  onOpenChange,
  mode,
  data,
}: JurusanDialogProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<JurusanInput>({
    resolver: zodResolver(jurusanSchema),
    defaultValues: {
      kode: data?.kode ?? "",
      nama: data?.nama ?? "",
      deskripsi: data?.deskripsi ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        kode: data?.kode ?? "",
        nama: data?.nama ?? "",
        deskripsi: data?.deskripsi ?? "",
      });
      setServerError(null);
    }
  }, [open, data, reset]);

  function onSubmit(values: JurusanInput) {
    start(async () => {
      const res =
        mode === "create"
          ? await createJurusanAction(values)
          : await updateJurusanAction(data!.id, values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof JurusanInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Jurusan ditambahkan." : "Jurusan diperbarui.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Jurusan" : "Edit Jurusan"}
          </DialogTitle>
          <DialogDescription>
            Kode jurusan dipakai juga di laporan dan seed — pakai format singkat
            (mis. <code>RPL</code>, <code>TKR</code>).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
          <div className="space-y-1">
            <Label htmlFor="kode">Kode</Label>
            <Input id="kode" {...register("kode")} />
            {errors.kode && (
              <p className="text-xs text-destructive">{errors.kode.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="nama">Nama</Label>
            <Input id="nama" {...register("nama")} />
            {errors.nama && (
              <p className="text-xs text-destructive">{errors.nama.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="deskripsi">Deskripsi (opsional)</Label>
            <Textarea id="deskripsi" rows={3} {...register("deskripsi")} />
            {errors.deskripsi && (
              <p className="text-xs text-destructive">
                {errors.deskripsi.message}
              </p>
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
