"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { MapPicker } from "@/components/map-picker";
import {
  dudiProfilSchema,
  type DudiProfilInput,
} from "@/lib/validations/dudi";
import { updateDudiProfilAction } from "./actions";

interface DudiProfilFormProps {
  email: string;
  defaults: DudiProfilInput;
}

export function DudiProfilForm({ email, defaults }: DudiProfilFormProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [bidangInput, setBidangInput] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DudiProfilInput>({
    resolver: zodResolver(dudiProfilSchema),
    defaultValues: defaults,
  });

  const bidangUsaha = watch("bidangUsaha");
  const fotoUrls = watch("fotoUrls");
  const lat = watch("latitude");
  const lng = watch("longitude");

  function addBidang() {
    const v = bidangInput.trim();
    if (!v) return;
    if (bidangUsaha.includes(v)) {
      toast.info("Bidang sudah ada.");
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
  function addFoto(url: string | null) {
    if (!url) return;
    if (fotoUrls.length >= 10) {
      toast.error("Maksimal 10 foto galeri.");
      return;
    }
    setValue("fotoUrls", [...fotoUrls, url], { shouldDirty: true });
  }
  function removeFoto(url: string) {
    setValue(
      "fotoUrls",
      fotoUrls.filter((u) => u !== url),
      { shouldDirty: true },
    );
  }

  function onSubmit(values: DudiProfilInput) {
    setServerError(null);
    start(async () => {
      const res = await updateDudiProfilAction(values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof DudiProfilInput, {
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
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Identitas Perusahaan</h2>
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
          <Label htmlFor="deskripsi">Deskripsi</Label>
          <Textarea id="deskripsi" rows={4} {...register("deskripsi")} />
          {errors.deskripsi && (
            <p className="text-xs text-destructive">
              {errors.deskripsi.message as string}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="websiteUrl">Website</Label>
          <Input
            id="websiteUrl"
            placeholder="https://"
            {...register("websiteUrl")}
          />
          {errors.websiteUrl && (
            <p className="text-xs text-destructive">
              {errors.websiteUrl.message as string}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Logo perusahaan</Label>
          <Controller
            control={control}
            name="logoUrl"
            render={({ field }) => (
              <FileUpload
                value={field.value ?? null}
                onChange={field.onChange}
                folder="logo"
                accept="image/*"
              />
            )}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Lokasi</h2>
        <div className="space-y-1">
          <Label htmlFor="alamat">Alamat</Label>
          <Textarea id="alamat" rows={2} {...register("alamat")} />
          {errors.alamat && (
            <p className="text-xs text-destructive">{errors.alamat.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Koordinat perusahaan</Label>
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
            <Label htmlFor="jabatanPIC">Jabatan PIC</Label>
            <Input id="jabatanPIC" {...register("jabatanPIC")} />
            {errors.jabatanPIC && (
              <p className="text-xs text-destructive">
                {errors.jabatanPIC.message as string}
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
          <div className="space-y-1">
            <Label htmlFor="emailPIC">Email PIC</Label>
            <Input id="emailPIC" type="email" {...register("emailPIC")} />
            {errors.emailPIC && (
              <p className="text-xs text-destructive">
                {errors.emailPIC.message as string}
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
                  placeholder="Mis. Web Development, F&B"
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
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Galeri Foto</h2>
        <p className="text-xs text-muted-foreground">
          Tambahkan foto kantor/workspace untuk membantu siswa kenal perusahaan
          (maks. 10).
        </p>
        {fotoUrls.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {fotoUrls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Foto galeri"
                  className="h-24 w-24 rounded-md border object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFoto(url)}
                  className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow hover:bg-accent"
                  aria-label="Hapus foto"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {fotoUrls.length < 10 && (
          <FileUpload
            value={null}
            onChange={addFoto}
            folder="gallery"
            accept="image/*"
            buttonLabel="Tambah foto"
          />
        )}
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Simpan perubahan
        </Button>
      </div>
    </form>
  );
}
