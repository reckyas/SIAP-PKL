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
  dokumenSchema,
  type DokumenInput,
} from "@/lib/validations/master";
import { createDokumenAction, updateDokumenAction } from "./actions";

export interface DokumenDialogData {
  id: string;
  nama: string;
  deskripsi: string;
}

interface DokumenDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  data?: DokumenDialogData;
}

export function DokumenDialog({
  open,
  onOpenChange,
  mode,
  data,
}: DokumenDialogProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DokumenInput>({
    resolver: zodResolver(dokumenSchema),
    defaultValues: {
      nama: data?.nama ?? "",
      deskripsi: data?.deskripsi ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nama: data?.nama ?? "",
        deskripsi: data?.deskripsi ?? "",
      });
      setServerError(null);
    }
  }, [open, data, reset]);

  function onSubmit(values: DokumenInput) {
    start(async () => {
      const res =
        mode === "create"
          ? await createDokumenAction(values)
          : await updateDokumenAction(data!.id, values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof DokumenInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Dokumen ditambahkan." : "Dokumen diperbarui.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Dokumen" : "Edit Dokumen"}
          </DialogTitle>
          <DialogDescription>
            Contoh: CV, Surat Izin Orang Tua, Pas Foto, Surat Sehat.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}
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
