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
import {
  keahlianSchema,
  type KeahlianInput,
} from "@/lib/validations/master";
import { createKeahlianAction, updateKeahlianAction } from "./actions";

export interface KeahlianDialogData {
  id: string;
  nama: string;
  kategori: string;
}

interface KeahlianDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  data?: KeahlianDialogData;
}

export function KeahlianDialog({
  open,
  onOpenChange,
  mode,
  data,
}: KeahlianDialogProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<KeahlianInput>({
    resolver: zodResolver(keahlianSchema),
    defaultValues: {
      nama: data?.nama ?? "",
      kategori: data?.kategori ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nama: data?.nama ?? "",
        kategori: data?.kategori ?? "",
      });
      setServerError(null);
    }
  }, [open, data, reset]);

  function onSubmit(values: KeahlianInput) {
    start(async () => {
      const res =
        mode === "create"
          ? await createKeahlianAction(values)
          : await updateKeahlianAction(data!.id, values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof KeahlianInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Keahlian ditambahkan." : "Keahlian diperbarui.",
      );
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tambah Keahlian" : "Edit Keahlian"}
          </DialogTitle>
          <DialogDescription>
            Contoh: <em>Web Frontend</em>, <em>Jaringan Komputer</em>,
            <em> Desain Grafis</em>.
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
            <Label htmlFor="kategori">Kategori (opsional)</Label>
            <Input
              id="kategori"
              placeholder="Mis. IT, Otomotif, Administrasi"
              {...register("kategori")}
            />
            {errors.kategori && (
              <p className="text-xs text-destructive">
                {errors.kategori.message}
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
