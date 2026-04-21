"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPicker } from "@/components/map-picker";
import {
  registerDudiSchema,
  type RegisterDudiInput,
} from "@/lib/validations/auth";
import { registerDudiAction } from "./actions";

export function DudiRegisterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bidangInput, setBidangInput] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterDudiInput>({
    resolver: zodResolver(registerDudiSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      namaPerusahaan: "",
      alamat: "",
      latitude: -7.8681,
      longitude: 111.4622,
      namaPIC: "",
      noHpPIC: "",
      bidangUsaha: [],
    },
  });

  const bidangUsaha = watch("bidangUsaha");
  const lat = watch("latitude");
  const lng = watch("longitude");

  function addBidang() {
    const v = bidangInput.trim();
    if (!v) return;
    if (bidangUsaha.includes(v)) {
      toast.info("Bidang sudah ditambahkan.");
      return;
    }
    if (bidangUsaha.length >= 10) {
      toast.error("Maksimal 10 bidang usaha.");
      return;
    }
    setValue("bidangUsaha", [...bidangUsaha, v], { shouldValidate: true });
    setBidangInput("");
  }

  function removeBidang(v: string) {
    setValue(
      "bidangUsaha",
      bidangUsaha.filter((b) => b !== v),
      { shouldValidate: true },
    );
  }

  function onSubmit(values: RegisterDudiInput) {
    setServerError(null);
    start(async () => {
      const res = await registerDudiAction(values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof RegisterDudiInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal mendaftar.");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Pendaftaran berhasil dikirim</AlertTitle>
          <AlertDescription>
            Akun perusahaan Anda sudah masuk antrian verifikasi admin.
            Anda akan menerima notifikasi ketika akun sudah aktif — setelah itu
            silakan login untuk melengkapi profil & publikasi lowongan.
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button onClick={() => router.push("/login")}>Ke halaman login</Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Kembali ke beranda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Akun Login</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1 md:col-span-3">
            <Label htmlFor="email">Email perusahaan</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Konfirmasi password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Data Perusahaan</h2>
        <div className="space-y-1">
          <Label htmlFor="namaPerusahaan">Nama perusahaan</Label>
          <Input id="namaPerusahaan" {...register("namaPerusahaan")} />
          {errors.namaPerusahaan && (
            <p className="text-xs text-destructive">
              {errors.namaPerusahaan.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="alamat">Alamat</Label>
          <Textarea id="alamat" rows={2} {...register("alamat")} />
          {errors.alamat && (
            <p className="text-xs text-destructive">{errors.alamat.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Lokasi perusahaan</Label>
          <MapPicker
            value={{ lat, lng }}
            onChange={(c) => {
              setValue("latitude", c.lat, { shouldDirty: true });
              setValue("longitude", c.lng, { shouldDirty: true });
            }}
          />
          {(errors.latitude || errors.longitude) && (
            <p className="text-xs text-destructive">
              {errors.latitude?.message ?? errors.longitude?.message}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">PIC (Penanggung Jawab)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="namaPIC">Nama PIC</Label>
            <Input id="namaPIC" {...register("namaPIC")} />
            {errors.namaPIC && (
              <p className="text-xs text-destructive">
                {errors.namaPIC.message}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="noHpPIC">No. HP PIC</Label>
            <Input id="noHpPIC" inputMode="tel" {...register("noHpPIC")} />
            {errors.noHpPIC && (
              <p className="text-xs text-destructive">
                {errors.noHpPIC.message}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Bidang Usaha</h2>
        <Controller
          control={control}
          name="bidangUsaha"
          render={() => (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={bidangInput}
                  onChange={(e) => setBidangInput(e.target.value)}
                  placeholder="Mis. Web Development, Manufaktur, F&B"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addBidang();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addBidang}
                  disabled={!bidangInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>
              </div>
              {bidangUsaha.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {bidangUsaha.map((b) => (
                    <Badge key={b} variant="secondary" className="gap-1">
                      {b}
                      <button
                        type="button"
                        onClick={() => removeBidang(b)}
                        className="rounded-full hover:bg-destructive/20"
                        aria-label={`Hapus ${b}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {errors.bidangUsaha && (
                <p className="text-xs text-destructive">
                  {errors.bidangUsaha.message as string}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tekan Enter atau klik Tambah. Minimal 1, maksimal 10 bidang.
              </p>
            </div>
          )}
        />
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/login")}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Daftar
        </Button>
      </div>
    </form>
  );
}
