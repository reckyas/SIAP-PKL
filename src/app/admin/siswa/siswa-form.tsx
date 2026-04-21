"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { MapPicker } from "@/components/map-picker";
import {
  createSiswaSchema,
  editSiswaSchema,
  type CreateSiswaInput,
  type EditSiswaInput,
} from "@/lib/validations/siswa";
import { createSiswaAction, updateSiswaAction } from "./actions";

export interface SiswaFormJurusan {
  id: string;
  kode: string;
  nama: string;
}

export interface SiswaFormKelas {
  id: string;
  nama: string;
  tingkat: "X" | "XI" | "XII" | "XIII";
  jurusanId: string;
}

export interface SiswaFormGuru {
  id: string;
  nama: string;
}

export interface SiswaFormDefaults {
  email: string;
  nis: string;
  nama: string;
  jenisKelamin: "LAKI_LAKI" | "PEREMPUAN";
  tanggalLahir: string; // yyyy-mm-dd
  alamat: string;
  latitude: number | null;
  longitude: number | null;
  noHp: string;
  kelasId: string;
  jurusanId: string;
  guruId: string | null;
}

interface SiswaFormProps {
  mode: "create" | "edit";
  siswaId?: string;
  defaults?: Partial<SiswaFormDefaults>;
  jurusan: SiswaFormJurusan[];
  kelas: SiswaFormKelas[];
  guru: SiswaFormGuru[];
}

const BLANK: SiswaFormDefaults = {
  email: "",
  nis: "",
  nama: "",
  jenisKelamin: "LAKI_LAKI",
  tanggalLahir: "",
  alamat: "",
  latitude: null,
  longitude: null,
  noHp: "",
  kelasId: "",
  jurusanId: "",
  guruId: null,
};

type FormValues = CreateSiswaInput & { guruId: string | null };

export function SiswaForm({
  mode,
  siswaId,
  defaults,
  jurusan,
  kelas,
  guru,
}: SiswaFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const merged = { ...BLANK, ...defaults };

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      mode === "create" ? createSiswaSchema : editSiswaSchema,
    ),
    defaultValues: {
      email: merged.email,
      passwordAwal: "",
      nis: merged.nis,
      nama: merged.nama,
      jenisKelamin: merged.jenisKelamin,
      tanggalLahir: merged.tanggalLahir
        ? (new Date(merged.tanggalLahir) as unknown as Date)
        : (undefined as unknown as Date),
      alamat: merged.alamat,
      latitude: merged.latitude,
      longitude: merged.longitude,
      noHp: merged.noHp,
      kelasId: merged.kelasId,
      jurusanId: merged.jurusanId,
      guruId: merged.guruId,
    },
  });

  const lat = watch("latitude");
  const lng = watch("longitude");
  const jurusanIdSelected = watch("jurusanId");
  const kelasIdSelected = watch("kelasId");
  const kelasByJurusan = kelas.filter((k) => k.jurusanId === jurusanIdSelected);

  function onSubmit(values: FormValues) {
    setServerError(null);
    start(async () => {
      const payload = {
        ...values,
        guruId: values.guruId && values.guruId !== "__NONE__" ? values.guruId : null,
      };
      const res =
        mode === "create"
          ? await createSiswaAction(payload as CreateSiswaInput)
          : await updateSiswaAction(siswaId!, payload as EditSiswaInput);

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
        mode === "create" ? "Siswa berhasil ditambahkan." : "Siswa diperbarui.",
      );
      router.push("/admin/siswa");
      router.refresh();
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

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Akun</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="off"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>
          {mode === "create" && (
            <div className="space-y-1">
              <Label htmlFor="passwordAwal">
                Password awal{" "}
                <span className="text-muted-foreground">
                  (kosongkan → default = NIS)
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
              <p className="text-xs text-muted-foreground">
                Siswa akan dipaksa ganti password saat login pertama.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Data Diri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nis">NIS</Label>
            <Input id="nis" {...register("nis")} />
            {errors.nis && (
              <p className="text-xs text-destructive">{errors.nis.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="nama">Nama lengkap</Label>
            <Input id="nama" {...register("nama")} />
            {errors.nama && (
              <p className="text-xs text-destructive">{errors.nama.message}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="jenisKelamin">Jenis kelamin</Label>
            <Controller
              control={control}
              name="jenisKelamin"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="jenisKelamin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.jenisKelamin && (
              <p className="text-xs text-destructive">
                {errors.jenisKelamin.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tanggalLahir">Tanggal lahir</Label>
            <Input
              id="tanggalLahir"
              type="date"
              {...register("tanggalLahir", { valueAsDate: true })}
            />
            {errors.tanggalLahir && (
              <p className="text-xs text-destructive">
                {errors.tanggalLahir.message as string}
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
        </div>
        <div className="space-y-1">
          <Label htmlFor="alamat">Alamat</Label>
          <Input id="alamat" {...register("alamat")} />
          {errors.alamat && (
            <p className="text-xs text-destructive">{errors.alamat.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label>Koordinat rumah (opsional)</Label>
          <MapPicker
            value={
              typeof lat === "number" && typeof lng === "number"
                ? { lat, lng }
                : null
            }
            onChange={(c) => {
              setValue("latitude", c.lat, { shouldDirty: true });
              setValue("longitude", c.lng, { shouldDirty: true });
            }}
          />
          <p className="text-xs text-muted-foreground">
            Dipakai untuk rekomendasi SAW (hitung jarak ke DU/DI).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Akademik</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="jurusanId">Jurusan</Label>
            <Controller
              control={control}
              name="jurusanId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Reset kelas kalau tidak cocok dengan jurusan baru.
                    const stillValid = kelas.some(
                      (k) => k.id === kelasIdSelected && k.jurusanId === v,
                    );
                    if (!stillValid) {
                      setValue("kelasId", "", { shouldValidate: true });
                    }
                  }}
                >
                  <SelectTrigger id="jurusanId">
                    <SelectValue placeholder="Pilih jurusan" />
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
                {errors.jurusanId.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="kelasId">Kelas</Label>
            <Controller
              control={control}
              name="kelasId"
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={field.onChange}
                  disabled={!jurusanIdSelected}
                >
                  <SelectTrigger id="kelasId">
                    <SelectValue
                      placeholder={
                        jurusanIdSelected
                          ? kelasByJurusan.length === 0
                            ? "Jurusan ini belum punya kelas"
                            : "Pilih kelas"
                          : "Pilih jurusan dulu"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {kelasByJurusan.map((k) => (
                      <SelectItem key={k.id} value={k.id}>
                        {k.tingkat} — {k.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.kelasId && (
              <p className="text-xs text-destructive">
                {errors.kelasId.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="guruId">Guru pembimbing (opsional)</Label>
          <Controller
            control={control}
            name="guruId"
            render={({ field }) => (
              <Select
                value={field.value ?? "__NONE__"}
                onValueChange={(v) => field.onChange(v === "__NONE__" ? null : v)}
              >
                <SelectTrigger id="guruId">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__NONE__">— Belum ditentukan —</SelectItem>
                  {guru.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/siswa")}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Simpan siswa" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
