"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  reviewDudiSchema,
  type ReviewDudiInput,
} from "@/lib/validations/review";
import { upsertReviewDudiAction } from "./actions";

export interface ReviewFormDefaults {
  dudiId: string;
  rating: number;
  komentar: string;
  anonim: boolean;
}

interface ReviewFormProps {
  defaults: ReviewFormDefaults;
  mode: "create" | "edit";
}

export function ReviewForm({ defaults, mode }: ReviewFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReviewDudiInput>({
    resolver: zodResolver(reviewDudiSchema),
    defaultValues: defaults,
  });

  const rating = watch("rating");
  const anonim = watch("anonim");

  function onSubmit(values: ReviewDudiInput) {
    setServerError(null);
    start(async () => {
      const res = await upsertReviewDudiAction(values);
      if (res.ok) {
        toast.success(
          mode === "create" ? "Review terkirim." : "Review diperbarui.",
        );
        router.push("/siswa/review");
        router.refresh();
      } else {
        setServerError(res.error ?? "Gagal menyimpan.");
        if (res.fieldErrors) {
          for (const [k, msg] of Object.entries(res.fieldErrors)) {
            setError(k as keyof ReviewDudiInput, { message: msg });
          }
        }
      }
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

      <input type="hidden" {...register("dudiId")} />
      <input type="hidden" {...register("rating", { valueAsNumber: true })} />

      <div className="space-y-1.5">
        <Label>Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() =>
                setValue("rating", n, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              className="p-1 text-muted-foreground transition-colors hover:text-amber-500"
              aria-label={`Beri rating ${n}`}
            >
              <Star
                className={cn(
                  "h-7 w-7",
                  n <= rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground",
                )}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {rating > 0 ? `${rating}/5` : "Belum dipilih"}
          </span>
        </div>
        {errors.rating && (
          <p className="text-xs text-destructive">{errors.rating.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="komentar">Komentar (opsional)</Label>
        <Textarea
          id="komentar"
          rows={5}
          placeholder="Ceritakan pengalaman PKL Anda: bimbingan, fasilitas, lingkungan kerja, dll."
          {...register("komentar")}
        />
        {errors.komentar && (
          <p className="text-xs text-destructive">{errors.komentar.message}</p>
        )}
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="anonim"
          checked={anonim}
          onCheckedChange={(v) =>
            setValue("anonim", v === true, { shouldDirty: true })
          }
        />
        <div className="space-y-0.5">
          <Label htmlFor="anonim" className="cursor-pointer">
            Kirim sebagai anonim
          </Label>
          <p className="text-xs text-muted-foreground">
            Nama Anda tidak ditampilkan ke DU/DI maupun siswa lain. Admin
            tetap dapat melihat identitas.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Kirim review" : "Simpan perubahan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
