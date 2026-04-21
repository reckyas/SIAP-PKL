"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { daftarLowonganAction } from "@/app/siswa/pendaftaran/actions";

interface DaftarButtonProps {
  lowonganId: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function DaftarButton({
  lowonganId,
  disabled,
  disabledReason,
}: DaftarButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [motivasi, setMotivasi] = useState("");
  const [pending, start] = useTransition();

  function handleSubmit() {
    start(async () => {
      const res = await daftarLowonganAction({
        lowonganId,
        motivasi: motivasi.trim(),
      });
      if (res.ok && res.data) {
        toast.success("Pendaftaran terkirim. Menunggu approval guru.");
        setOpen(false);
        router.push(`/siswa/pendaftaran/${res.data.id}`);
      } else {
        toast.error(res.error ?? "Gagal mendaftar.");
      }
    });
  }

  if (disabled) {
    return (
      <Button disabled className="w-full" title={disabledReason}>
        {disabledReason ?? "Tidak bisa mendaftar"}
      </Button>
    );
  }

  return (
    <>
      <Button className="w-full" onClick={() => setOpen(true)}>
        <Send className="h-4 w-4" />
        Daftar sekarang
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daftar ke lowongan ini?</DialogTitle>
            <DialogDescription>
              Tulis motivasi singkat (opsional). Setelah submit, guru
              pembimbing Anda akan diminta persetujuan dulu.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivasi">Motivasi (opsional, maks 2000)</Label>
            <Textarea
              id="motivasi"
              rows={5}
              value={motivasi}
              onChange={(e) => setMotivasi(e.target.value)}
              placeholder="Contoh: Saya tertarik karena…"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kirim pendaftaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
