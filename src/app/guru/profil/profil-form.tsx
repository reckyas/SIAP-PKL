"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import {
  guruProfilSchema,
  type GuruProfilInput,
} from "@/lib/validations/guru";
import { updateGuruProfilAction } from "./actions";

interface GuruProfilFormProps {
  email: string;
  defaults: GuruProfilInput;
}

export function GuruProfilForm({ email, defaults }: GuruProfilFormProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<GuruProfilInput>({
    resolver: zodResolver(guruProfilSchema),
    defaultValues: defaults,
  });

  function onSubmit(values: GuruProfilInput) {
    setServerError(null);
    start(async () => {
      const res = await updateGuruProfilAction(values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof GuruProfilInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success("Profil diperbarui.");
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1">
        <Label>Email (login)</Label>
        <Input value={email} disabled />
        <p className="text-xs text-muted-foreground">
          Hubungi admin untuk mengubah email.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input id="nama" {...register("nama")} />
          {errors.nama && (
            <p className="text-xs text-destructive">{errors.nama.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="nip">NIP</Label>
          <Input id="nip" {...register("nip")} />
          {errors.nip && (
            <p className="text-xs text-destructive">
              {errors.nip.message as string}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="noHp">No. HP</Label>
          <Input id="noHp" inputMode="tel" {...register("noHp")} />
          {errors.noHp && (
            <p className="text-xs text-destructive">{errors.noHp.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="mataPelajaran">Mata pelajaran</Label>
          <Input id="mataPelajaran" {...register("mataPelajaran")} />
          {errors.mataPelajaran && (
            <p className="text-xs text-destructive">
              {errors.mataPelajaran.message as string}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Foto profil</Label>
        <Controller
          control={control}
          name="fotoUrl"
          render={({ field }) => (
            <FileUpload
              value={field.value ?? null}
              onChange={field.onChange}
              folder="foto"
              accept="image/*"
            />
          )}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}
