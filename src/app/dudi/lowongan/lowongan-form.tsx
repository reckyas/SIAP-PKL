"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BidangPicker } from "@/components/bidang-picker";
import type { BidangItem } from "@/app/api/bidang/actions";
import {
  lowonganSchema,
  type LowonganInput,
} from "@/lib/validations/lowongan";
import { createLowonganAction, updateLowonganAction } from "./actions";

export interface KeahlianOption {
  id: string;
  nama: string;
  kategori: string | null;
}

export interface DokumenOption {
  id: string;
  nama: string;
}

export interface JurusanOption {
  id: string;
  kode: string;
  nama: string;
}

export interface LowonganFormDefaults {
  judul: string;
  deskripsi: string;
  bidang: string[];
  jurusanIds: string[];
  kuotaTotal: number;
  kuotaLaki: number;
  kuotaPerempuan: number;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
  keahlianDibutuhkan: { keahlianId: string; levelMinimum: number }[];
  dokumenDibutuhkan: { dokumenId: string; wajib: boolean }[];
  nilaiMinimum: number | null;
  uangSaku: number | null;
  makanSiang: boolean;
  transport: boolean;
  fasilitasLain: string;
  jamKerja: string;
  hariKerja: string;
  dressCode: string;
  catatanKhusus: string;
}

export const BLANK_LOWONGAN: LowonganFormDefaults = {
  judul: "",
  deskripsi: "",
  bidang: [],
  jurusanIds: [],
  kuotaTotal: 1,
  kuotaLaki: 1,
  kuotaPerempuan: 0,
  tanggalMulai: null,
  tanggalSelesai: null,
  keahlianDibutuhkan: [],
  dokumenDibutuhkan: [],
  nilaiMinimum: null,
  uangSaku: null,
  makanSiang: false,
  transport: false,
  fasilitasLain: "",
  jamKerja: "",
  hariKerja: "",
  dressCode: "",
  catatanKhusus: "",
};

interface LowonganFormProps {
  mode: "create" | "edit";
  lowonganId?: string;
  defaults?: LowonganFormDefaults;
  keahlianMaster: KeahlianOption[];
  dokumenMaster: DokumenOption[];
  jurusanMaster: JurusanOption[];
  bidangMaster: BidangItem[];
}

export function LowonganForm({
  mode,
  lowonganId,
  defaults,
  keahlianMaster,
  dokumenMaster,
  jurusanMaster,
  bidangMaster,
}: LowonganFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [keahlianPick, setKeahlianPick] = useState("");
  const [dokumenPick, setDokumenPick] = useState("");

  const merged = defaults ?? BLANK_LOWONGAN;

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<LowonganInput>({
    resolver: zodResolver(lowonganSchema),
    defaultValues: {
      judul: merged.judul,
      deskripsi: merged.deskripsi,
      bidang: merged.bidang,
      jurusanIds: merged.jurusanIds,
      kuotaTotal: merged.kuotaTotal,
      kuotaLaki: merged.kuotaLaki,
      kuotaPerempuan: merged.kuotaPerempuan,
      tanggalMulai: merged.tanggalMulai ?? (undefined as unknown as Date),
      tanggalSelesai: merged.tanggalSelesai ?? (undefined as unknown as Date),
      keahlianDibutuhkan: merged.keahlianDibutuhkan,
      dokumenDibutuhkan: merged.dokumenDibutuhkan,
      nilaiMinimum: merged.nilaiMinimum,
      uangSaku: merged.uangSaku,
      makanSiang: merged.makanSiang,
      transport: merged.transport,
      fasilitasLain: merged.fasilitasLain,
      jamKerja: merged.jamKerja,
      hariKerja: merged.hariKerja,
      dressCode: merged.dressCode,
      catatanKhusus: merged.catatanKhusus,
    },
  });

  const jurusanIds = watch("jurusanIds");
  const keahlianList = watch("keahlianDibutuhkan");
  const dokumenList = watch("dokumenDibutuhkan");

  function toggleJurusan(id: string, checked: boolean) {
    const next = checked
      ? [...jurusanIds, id]
      : jurusanIds.filter((j) => j !== id);
    setValue("jurusanIds", next, { shouldValidate: true });
  }

  function addKeahlian() {
    if (!keahlianPick) return;
    if (keahlianList.some((k) => k.keahlianId === keahlianPick)) {
      toast.info("Keahlian sudah ditambahkan.");
      return;
    }
    setValue(
      "keahlianDibutuhkan",
      [...keahlianList, { keahlianId: keahlianPick, levelMinimum: 3 }],
      { shouldValidate: true },
    );
    setKeahlianPick("");
  }
  function removeKeahlian(id: string) {
    setValue(
      "keahlianDibutuhkan",
      keahlianList.filter((k) => k.keahlianId !== id),
      { shouldValidate: true },
    );
  }
  function setKeahlianLevel(id: string, lvl: number) {
    setValue(
      "keahlianDibutuhkan",
      keahlianList.map((k) =>
        k.keahlianId === id ? { ...k, levelMinimum: lvl } : k,
      ),
      { shouldValidate: true },
    );
  }

  function addDokumen() {
    if (!dokumenPick) return;
    if (dokumenList.some((d) => d.dokumenId === dokumenPick)) {
      toast.info("Dokumen sudah ditambahkan.");
      return;
    }
    setValue(
      "dokumenDibutuhkan",
      [...dokumenList, { dokumenId: dokumenPick, wajib: true }],
      { shouldValidate: true },
    );
    setDokumenPick("");
  }
  function removeDokumen(id: string) {
    setValue(
      "dokumenDibutuhkan",
      dokumenList.filter((d) => d.dokumenId !== id),
      { shouldValidate: true },
    );
  }
  function toggleDokumenWajib(id: string, v: boolean) {
    setValue(
      "dokumenDibutuhkan",
      dokumenList.map((d) =>
        d.dokumenId === id ? { ...d, wajib: v } : d,
      ),
      { shouldValidate: true },
    );
  }

  function onSubmit(values: LowonganInput) {
    setServerError(null);
    start(async () => {
      const res =
        mode === "create"
          ? await createLowonganAction(values)
          : await updateLowonganAction(lowonganId!, values);
      if (!res.ok) {
        setServerError(res.error ?? null);
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof LowonganInput, {
              type: "server",
              message: msg,
            });
          }
        }
        toast.error(res.error ?? "Gagal menyimpan.");
        return;
      }
      toast.success(
        mode === "create"
          ? "Lowongan ditambahkan (status DRAFT)."
          : "Lowongan diperbarui.",
      );
      router.push("/dudi/lowongan");
      router.refresh();
    });
  }

  const keahlianById = new Map(keahlianMaster.map((k) => [k.id, k]));
  const dokumenById = new Map(dokumenMaster.map((d) => [d.id, d]));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Informasi Utama</h2>
        <div className="space-y-1">
          <Label htmlFor="judul">Judul lowongan</Label>
          <Input
            id="judul"
            placeholder="Mis. Magang Web Developer"
            {...register("judul")}
          />
          {errors.judul && (
            <p className="text-xs text-destructive">{errors.judul.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <Label htmlFor="deskripsi">Deskripsi pekerjaan</Label>
          <Textarea id="deskripsi" rows={6} {...register("deskripsi")} />
          {errors.deskripsi && (
            <p className="text-xs text-destructive">
              {errors.deskripsi.message}
            </p>
          )}
        </div>
        <Controller
          control={control}
          name="bidang"
          render={({ field }) => (
            <div className="space-y-2">
              <Label>Bidang / tag</Label>
              <BidangPicker
                value={field.value}
                onChange={field.onChange}
                master={bidangMaster}
                placeholder="Mis. Web, Backend, F&B"
              />
              {errors.bidang && (
                <p className="text-xs text-destructive">
                  {errors.bidang.message as string}
                </p>
              )}
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Jurusan Target</h2>
        <p className="text-xs text-muted-foreground">
          Pilih jurusan yang relevan dengan lowongan ini. Siswa dari jurusan
          yang tidak dipilih <span className="font-medium">tidak akan</span>{" "}
          melihat lowongan ini di pencarian maupun rekomendasi.
        </p>
        <Controller
          control={control}
          name="jurusanIds"
          render={() => (
            <div className="space-y-2">
              <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2 md:grid-cols-3">
                {jurusanMaster.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Belum ada master jurusan.
                  </p>
                ) : (
                  jurusanMaster.map((j) => {
                    const checked = jurusanIds.includes(j.id);
                    return (
                      <label
                        key={j.id}
                        className="flex cursor-pointer items-start gap-2 text-sm"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            toggleJurusan(j.id, v === true)
                          }
                        />
                        <div className="min-w-0">
                          <div className="font-medium">{j.nama}</div>
                          <div className="font-mono text-[11px] text-muted-foreground">
                            {j.kode}
                          </div>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
              {errors.jurusanIds && (
                <p className="text-xs text-destructive">
                  {errors.jurusanIds.message as string}
                </p>
              )}
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Kuota & Periode</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="kuotaTotal">Kuota total</Label>
            <Input
              id="kuotaTotal"
              type="number"
              min={1}
              {...register("kuotaTotal", { valueAsNumber: true })}
            />
            {errors.kuotaTotal && (
              <p className="text-xs text-destructive">
                {errors.kuotaTotal.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="kuotaLaki">Kuota laki-laki</Label>
            <Input
              id="kuotaLaki"
              type="number"
              min={0}
              {...register("kuotaLaki", { valueAsNumber: true })}
            />
            {errors.kuotaLaki && (
              <p className="text-xs text-destructive">
                {errors.kuotaLaki.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="kuotaPerempuan">Kuota perempuan</Label>
            <Input
              id="kuotaPerempuan"
              type="number"
              min={0}
              {...register("kuotaPerempuan", { valueAsNumber: true })}
            />
            {errors.kuotaPerempuan && (
              <p className="text-xs text-destructive">
                {errors.kuotaPerempuan.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="tanggalMulai">Tanggal mulai</Label>
            <Input
              id="tanggalMulai"
              type="date"
              {...register("tanggalMulai", { valueAsDate: true })}
            />
            {errors.tanggalMulai && (
              <p className="text-xs text-destructive">
                {errors.tanggalMulai.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="tanggalSelesai">Tanggal selesai</Label>
            <Input
              id="tanggalSelesai"
              type="date"
              {...register("tanggalSelesai", { valueAsDate: true })}
            />
            {errors.tanggalSelesai && (
              <p className="text-xs text-destructive">
                {errors.tanggalSelesai.message as string}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Keahlian yang Dibutuhkan</h2>
        <Controller
          control={control}
          name="keahlianDibutuhkan"
          render={() => (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={keahlianPick} onValueChange={setKeahlianPick}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih keahlian…" />
                  </SelectTrigger>
                  <SelectContent>
                    {keahlianMaster
                      .filter(
                        (k) =>
                          !keahlianList.some((x) => x.keahlianId === k.id),
                      )
                      .map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.nama}
                          {k.kategori ? ` · ${k.kategori}` : ""}
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
              {keahlianList.length > 0 && (
                <div className="space-y-1">
                  {keahlianList.map((k) => {
                    const master = keahlianById.get(k.keahlianId);
                    return (
                      <div
                        key={k.keahlianId}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="flex-1 text-sm">
                          {master?.nama ?? "(tidak diketahui)"}
                        </div>
                        <Label className="text-xs">Level min</Label>
                        <Select
                          value={String(k.levelMinimum)}
                          onValueChange={(v) =>
                            setKeahlianLevel(k.keahlianId, Number(v))
                          }
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((l) => (
                              <SelectItem key={l} value={String(l)}>
                                {l}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeKeahlian(k.keahlianId)}
                          aria-label="Hapus"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.keahlianDibutuhkan && (
                <p className="text-xs text-destructive">
                  {errors.keahlianDibutuhkan.message as string}
                </p>
              )}
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Dokumen yang Dibutuhkan</h2>
        <Controller
          control={control}
          name="dokumenDibutuhkan"
          render={() => (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Select value={dokumenPick} onValueChange={setDokumenPick}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Pilih dokumen…" />
                  </SelectTrigger>
                  <SelectContent>
                    {dokumenMaster
                      .filter(
                        (d) =>
                          !dokumenList.some((x) => x.dokumenId === d.id),
                      )
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.nama}
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
              {dokumenList.length > 0 && (
                <div className="space-y-1">
                  {dokumenList.map((d) => {
                    const master = dokumenById.get(d.dokumenId);
                    return (
                      <div
                        key={d.dokumenId}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="flex-1 text-sm">
                          {master?.nama ?? "(tidak diketahui)"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`wajib-${d.dokumenId}`}
                            className="text-xs"
                          >
                            Wajib
                          </Label>
                          <Checkbox
                            id={`wajib-${d.dokumenId}`}
                            checked={d.wajib}
                            onCheckedChange={(v) =>
                              toggleDokumenWajib(d.dokumenId, v === true)
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDokumen(d.dokumenId)}
                          aria-label="Hapus"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
              {errors.dokumenDibutuhkan && (
                <p className="text-xs text-destructive">
                  {errors.dokumenDibutuhkan.message as string}
                </p>
              )}
            </div>
          )}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Persyaratan & Fasilitas</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="nilaiMinimum">Nilai minimum (0-100)</Label>
            <Input
              id="nilaiMinimum"
              type="number"
              step="0.01"
              min={0}
              max={100}
              {...register("nilaiMinimum", {
                setValueAs: (v) =>
                  v === "" || v === null ? null : Number(v),
              })}
            />
            {errors.nilaiMinimum && (
              <p className="text-xs text-destructive">
                {errors.nilaiMinimum.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="uangSaku">Uang saku (Rp)</Label>
            <Input
              id="uangSaku"
              type="number"
              min={0}
              {...register("uangSaku", {
                setValueAs: (v) =>
                  v === "" || v === null ? null : Number(v),
              })}
            />
            {errors.uangSaku && (
              <p className="text-xs text-destructive">
                {errors.uangSaku.message as string}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <Controller
            control={control}
            name="makanSiang"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="makanSiang"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="makanSiang">Makan siang</Label>
              </div>
            )}
          />
          <Controller
            control={control}
            name="transport"
            render={({ field }) => (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="transport"
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
                <Label htmlFor="transport">Transport</Label>
              </div>
            )}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fasilitasLain">Fasilitas lain (opsional)</Label>
          <Textarea
            id="fasilitasLain"
            rows={2}
            {...register("fasilitasLain")}
          />
          {errors.fasilitasLain && (
            <p className="text-xs text-destructive">
              {errors.fasilitasLain.message as string}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold">Aturan Kerja (opsional)</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="jamKerja">Jam kerja</Label>
            <Input
              id="jamKerja"
              placeholder="08.00 – 16.00"
              {...register("jamKerja")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hariKerja">Hari kerja</Label>
            <Input
              id="hariKerja"
              placeholder="Senin – Jumat"
              {...register("hariKerja")}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dressCode">Dress code</Label>
            <Input
              id="dressCode"
              placeholder="Smart casual"
              {...register("dressCode")}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="catatanKhusus">Catatan khusus</Label>
          <Textarea
            id="catatanKhusus"
            rows={3}
            {...register("catatanKhusus")}
          />
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/dudi/lowongan")}
          disabled={pending}
        >
          Batal
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Simpan (DRAFT)" : "Simpan perubahan"}
        </Button>
      </div>
    </form>
  );
}
