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
import {
  createGuruSchema,
  editGuruSchema,
  type CreateGuruInput,
  type EditGuruInput,
} from "@/lib/validations/guru";
import { createGuruAction, updateGuruAction } from "./actions";

export interface GuruFormDefaults {
  email: string;
  nama: string;
  nip: string;
  noHp: string;
  mataPelajaran: string;
}

interface GuruFormProps {
  mode: "create" | "edit";
  guruId?: string;
  defaults?: Partial<GuruFormDefaults>;
}

const BLANK: GuruFormDefaults = {
  email: "",
  nama: "",
  nip: "",
  noHp: "",
  mataPelajaran: "",
};

type FormValues = CreateGuruInput;

export function GuruForm({ mode, guruId, defaults }: GuruFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const merged = { ...BLANK, ...defaults };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      mode === "create" ? createGuruSchema : editGuruSchema,
    ),
    defaultValues: {
      email: merged.email,
      passwordAwal: "",
      nama: merged.nama,
      nip: merged.nip,
      noHp: merged.noHp,
      mataPelajaran: merged.mataPelajaran,
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    start(async () => {
      const res =
        mode === "create"
          ? await createGuruAction(values)
          : await updateGuruAction(guruId!, values as EditGuruInput);

      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof FormValues, { type: "server", message: msg });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create" ? "Guru berhasil ditambahkan." : "Guru diperbarui.",
      );
      router.push("/admin/guru");
      router.refresh();
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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        {mode === "create" && (
          <div className="space-y-1">
            <Label htmlFor="passwordAwal">
              Password awal{" "}
              <span className="text-muted-foreground">
                (kosongkan → default = NIP atau guru12345)
              </span>
            </Label>
            <Input
              id="passwordAwal"
              type="text"
              autoComplete="off"
              {...register("passwordAwal")}
            />
            {errors.passwordAwal && (
              <p className="text-xs text-destructive">
                {errors.passwordAwal.message}
              </p>
            )}
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="nama">Nama lengkap</Label>
          <Input id="nama" {...register("nama")} />
          {errors.nama && (
            <p className="text-xs text-destructive">{errors.nama.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="nip">NIP (opsional)</Label>
          <Input id="nip" {...register("nip")} />
          {errors.nip && (
            <p className="text-xs text-destructive">{errors.nip.message}</p>
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
          <Label htmlFor="mataPelajaran">Mata pelajaran (opsional)</Label>
          <Input id="mataPelajaran" {...register("mataPelajaran")} />
          {errors.mataPelajaran && (
            <p className="text-xs text-destructive">
              {errors.mataPelajaran.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/guru")}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Simpan guru" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
