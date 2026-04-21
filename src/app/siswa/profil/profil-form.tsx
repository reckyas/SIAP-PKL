"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/file-upload";
import { MapPicker } from "@/components/map-picker";
import { BidangPicker } from "@/components/bidang-picker";
import type { BidangItem } from "@/app/api/bidang/actions";
import {
  siswaProfilSchema,
  type SiswaProfilInput,
} from "@/lib/validations/siswa";
import { updateSiswaProfilAction } from "./actions";

export interface MasterKeahlian {
  id: string;
  nama: string;
  kategori: string | null;
}
export interface MasterDokumen {
  id: string;
  nama: string;
  deskripsi: string | null;
}

interface SiswaProfilFormProps {
  lockedInfo: {
    email: string;
    nis: string;
    kelas: string | null;
    jurusanNama: string;
    guruNama: string | null;
  };
  defaults: SiswaProfilInput;
  keahlianMaster: MasterKeahlian[];
  dokumenMaster: MasterDokumen[];
  bidangMaster: BidangItem[];
}

export function SiswaProfilForm({
  lockedInfo,
  defaults,
  keahlianMaster,
  dokumenMaster,
  bidangMaster,
}: SiswaProfilFormProps) {
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [keahlianPick, setKeahlianPick] = useState<string>("");
  const [dokumenPick, setDokumenPick] = useState<string>("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<SiswaProfilInput>({
    resolver: zodResolver(siswaProfilSchema),
    defaultValues: defaults,
  });

  const keahlian = watch("keahlian");
  const dokumen = watch("dokumen");
  const lat = watch("latitude");
  const lng = watch("longitude");

  const keahlianLookup = new Map(keahlianMaster.map((k) => [k.id, k]));
  const dokumenLookup = new Map(dokumenMaster.map((x) => [x.id, x]));

  function addKeahlian() {
    if (!keahlianPick) return;
    if (keahlian.some((k) => k.keahlianId === keahlianPick)) {
      toast.info("Keahlian sudah ditambahkan.");
      return;
    }
    if (keahlian.length >= 20) {
      toast.error("Maksimal 20 keahlian.");
      return;
    }
    setValue(
      "keahlian",
      [...keahlian, { keahlianId: keahlianPick, level: 3 }],
      { shouldValidate: true },
    );
    setKeahlianPick("");
  }
  function updateKeahlianLevel(id: string, level: number) {
    setValue(
      "keahlian",
      keahlian.map((k) =>
        k.keahlianId === id ? { ...k, level } : k,
      ),
      { shouldValidate: true },
    );
  }
  function removeKeahlian(id: string) {
    setValue(
      "keahlian",
      keahlian.filter((k) => k.keahlianId !== id),
      { shouldValidate: true },
    );
  }

  function addDokumen() {
    if (!dokumenPick) return;
    if (dokumen.some((x) => x.dokumenId === dokumenPick)) {
      toast.info("Dokumen sudah ditambahkan.");
      return;
    }
    if (dokumen.length >= 20) {
      toast.error("Maksimal 20 dokumen.");
      return;
    }
    setValue(
      "dokumen",
      [...dokumen, { dokumenId: dokumenPick, fileUrl: "", nomorDok: "" }],
      { shouldValidate: true },
    );
    setDokumenPick("");
  }
  function updateDokumenFile(id: string, fileUrl: string | null) {
    setValue(
      "dokumen",
      dokumen.map((x) =>
        x.dokumenId === id ? { ...x, fileUrl: fileUrl ?? "" } : x,
      ),
      { shouldValidate: true },
    );
  }
  function updateDokumenNomor(id: string, nomor: string) {
    setValue(
      "dokumen",
      dokumen.map((x) =>
        x.dokumenId === id ? { ...x, nomorDok: nomor } : x,
      ),
      { shouldValidate: true },
    );
  }
  function removeDokumen(id: string) {
    setValue(
      "dokumen",
      dokumen.filter((x) => x.dokumenId !== id),
      { shouldValidate: true },
    );
  }

  function onSubmit(values: SiswaProfilInput) {
    setServerError(null);

    const invalidDoc = values.dokumen.find((x) => !x.fileUrl);
    if (invalidDoc) {
      const name = dokumenLookup.get(invalidDoc.dokumenId)?.nama ?? "";
      const msg = `Upload file untuk dokumen "${name}" atau hapus dari daftar.`;
      setServerError(msg);
      toast.error(msg);
      return;
    }

    start(async () => {
      const res = await updateSiswaProfilAction(values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof SiswaProfilInput, {
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

  const availableKeahlian = keahlianMaster.filter(
    (k) => !keahlian.some((v) => v.keahlianId === k.id),
  );
  const availableDokumen = dokumenMaster.filter(
    (x) => !dokumen.some((v) => v.dokumenId === x.id),
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Data Akademik (dikunci)</h2>
        <div className="grid gap-4 rounded-md border bg-muted/30 p-4 text-sm md:grid-cols-2">
          <InfoField label="Email" value={lockedInfo.email} />
          <InfoField label="NIS" value={lockedInfo.nis} />
          <InfoField
            label="Kelas"
            value={lockedInfo.kelas ?? "— Belum ditentukan —"}
          />
          <InfoField label="Jurusan" value={lockedInfo.jurusanNama} />
          <InfoField
            label="Guru pembimbing"
            value={lockedInfo.guruNama ?? "— Belum ditentukan —"}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Data Diri</h2>
        <div className="grid gap-4 md:grid-cols-2">
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
          <Textarea id="alamat" rows={2} {...register("alamat")} />
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
            Dipakai untuk hitung jarak di rekomendasi SAW.
          </p>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Preferensi PKL</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="jarakMaksimal">Jarak maksimal (km)</Label>
            <Input
              id="jarakMaksimal"
              type="number"
              step="0.1"
              inputMode="decimal"
              {...register("jarakMaksimal", {
                setValueAs: (v) =>
                  v === "" || v === null ? null : Number(v),
              })}
            />
            {errors.jarakMaksimal && (
              <p className="text-xs text-destructive">
                {errors.jarakMaksimal.message as string}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Controller
              control={control}
              name="bersediaKos"
              render={({ field }) => (
                <Checkbox
                  id="bersediaKos"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(Boolean(v))}
                />
              )}
            />
            <Label htmlFor="bersediaKos" className="cursor-pointer">
              Bersedia kos / tempat tinggal jauh
            </Label>
          </div>
        </div>

        <Controller
          control={control}
          name="bidangMinat"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Bidang minat</Label>
              <BidangPicker
                value={field.value}
                onChange={field.onChange}
                master={bidangMaster}
                placeholder="Mis. Web, Desain Grafis, F&B"
              />
              {errors.bidangMinat && (
                <p className="text-xs text-destructive">
                  {errors.bidangMinat.message as string}
                </p>
              )}
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Keahlian</h2>
        <p className="text-xs text-muted-foreground">
          Pilih keahlian dan tentukan level 1-5 (1 = pemula, 5 = mahir).
        </p>
        {availableKeahlian.length > 0 && (
          <div className="flex gap-2">
            <Select value={keahlianPick} onValueChange={setKeahlianPick}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih keahlian" />
              </SelectTrigger>
              <SelectContent>
                {availableKeahlian.map((k) => (
                  <SelectItem key={k.id} value={k.id}>
                    {k.nama}
                    {k.kategori ? ` (${k.kategori})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={addKeahlian}
              disabled={!keahlianPick}
            >
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        )}
        {keahlian.length > 0 ? (
          <ul className="space-y-2">
            {keahlian.map((k) => {
              const master = keahlianLookup.get(k.keahlianId);
              return (
                <li
                  key={k.keahlianId}
                  className="flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {master?.nama ?? "Keahlian dihapus"}
                    </p>
                    {master?.kategori && (
                      <p className="text-xs text-muted-foreground">
                        {master.kategori}
                      </p>
                    )}
                  </div>
                  <Select
                    value={String(k.level)}
                    onValueChange={(v) =>
                      updateKeahlianLevel(k.keahlianId, Number(v))
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((lv) => (
                        <SelectItem key={lv} value={String(lv)}>
                          Level {lv}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeKeahlian(k.keahlianId)}
                    aria-label="Hapus keahlian"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada keahlian. Tambahkan minimal satu supaya rekomendasi PKL
            lebih tepat.
          </p>
        )}
        {errors.keahlian && (
          <p className="text-xs text-destructive">
            {errors.keahlian.message as string}
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Dokumen</h2>
        <p className="text-xs text-muted-foreground">
          Unggah dokumen persyaratan (PDF/gambar). Nomor dokumen opsional untuk
          dokumen seperti KTP/KK.
        </p>
        {availableDokumen.length > 0 && (
          <div className="flex gap-2">
            <Select value={dokumenPick} onValueChange={setDokumenPick}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Pilih dokumen" />
              </SelectTrigger>
              <SelectContent>
                {availableDokumen.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              onClick={addDokumen}
              disabled={!dokumenPick}
            >
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        )}
        {dokumen.length > 0 ? (
          <ul className="space-y-3">
            {dokumen.map((x) => {
              const master = dokumenLookup.get(x.dokumenId);
              return (
                <li
                  key={x.dokumenId}
                  className="space-y-3 rounded-md border p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {master?.nama ?? "Dokumen dihapus"}
                      </p>
                      {master?.deskripsi && (
                        <p className="text-xs text-muted-foreground">
                          {master.deskripsi}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDokumen(x.dokumenId)}
                      aria-label="Hapus dokumen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Nomor dokumen (opsional)</Label>
                      <Input
                        value={x.nomorDok ?? ""}
                        onChange={(e) =>
                          updateDokumenNomor(x.dokumenId, e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>File</Label>
                      <FileUpload
                        value={x.fileUrl || null}
                        onChange={(url) =>
                          updateDokumenFile(x.dokumenId, url)
                        }
                        folder="dokumen"
                        accept="application/pdf,image/*"
                        variant="file"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada dokumen.</p>
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
