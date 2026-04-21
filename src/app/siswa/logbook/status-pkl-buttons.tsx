"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Play, Square } from "lucide-react";
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
import { mulaiPKLAction, selesaiPKLAction } from "./actions";

interface StatusPKLButtonsProps {
  mode: "mulai" | "selesai";
  // Label tambahan dari server: tanggal yg relevan (mulai/selesai).
  dateHint?: string;
}

export function StatusPKLButton({ mode, dateHint }: StatusPKLButtonsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleAction() {
    start(async () => {
      const res =
        mode === "mulai" ? await mulaiPKLAction() : await selesaiPKLAction();
      if (res.ok) {
        toast.success(
          mode === "mulai" ? "PKL dimulai. Selamat bekerja!" : "PKL selesai.",
        );
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal memproses.");
      }
    });
  }

  const title = mode === "mulai" ? "Mulai PKL?" : "Tandai PKL selesai?";
  const desc =
    mode === "mulai"
      ? `Tandai bahwa Anda sudah mulai menjalani PKL${dateHint ? ` (${dateHint})` : ""}. Setelah dimulai, Anda bisa mengisi logbook harian.`
      : `Tandai bahwa PKL Anda sudah berakhir${dateHint ? ` (${dateHint})` : ""}. Anda tidak akan bisa menambah logbook baru setelah ini.`;

  return (
    <>
      <Button
        variant={mode === "mulai" ? "default" : "outline"}
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        {mode === "mulai" ? (
          <Play className="h-4 w-4" />
        ) : (
          <Square className="h-4 w-4" />
        )}
        {mode === "mulai" ? "Mulai PKL" : "Tandai selesai"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{desc}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleAction} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
