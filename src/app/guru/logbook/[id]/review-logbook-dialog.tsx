"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
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
import { reviewLogbookAction } from "../actions";

interface ReviewLogbookDialogProps {
  logbookId: string;
  siswaNama: string;
  tanggalLabel: string;
}

export function ReviewLogbookDialog({
  logbookId,
  siswaNama,
  tanggalLabel,
}: ReviewLogbookDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState<false | "approve" | "revise">(false);
  const [catatan, setCatatan] = useState("");
  const [pending, start] = useTransition();

  function submit(approve: boolean) {
    start(async () => {
      const res = await reviewLogbookAction({
        logbookId,
        approve,
        catatan: catatan.trim(),
      });
      if (res.ok) {
        toast.success(
          approve
            ? "Logbook disetujui."
            : "Logbook dikembalikan untuk direvisi.",
        );
        setOpen(false);
        setCatatan("");
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal memproses.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button onClick={() => setOpen("approve")} disabled={pending}>
          <Check className="h-4 w-4" />
          Setujui
        </Button>
        <Button
          variant="destructive"
          onClick={() => setOpen("revise")}
          disabled={pending}
        >
          <RotateCcw className="h-4 w-4" />
          Minta revisi
        </Button>
      </div>
      <Dialog
        open={open !== false}
        onOpenChange={(v) => {
          if (!v) {
            setOpen(false);
            setCatatan("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "approve" ? "Setujui logbook?" : "Minta revisi?"}
            </DialogTitle>
            <DialogDescription>
              {siswaNama} · {tanggalLabel}.{" "}
              {open === "approve"
                ? "Catatan opsional — akan terkirim ke siswa."
                : "Tulis apa yang perlu diperbaiki; siswa bisa edit dan kirim ulang."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="catatan">
              Catatan {open === "revise" && "(wajib)"}
            </Label>
            <Textarea
              id="catatan"
              rows={4}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                open === "approve"
                  ? "Opsional, mis. apresiasi atau saran."
                  : "Jelaskan bagian mana yang perlu diperbaiki."
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setCatatan("");
              }}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              variant={open === "approve" ? "default" : "destructive"}
              onClick={() => submit(open === "approve")}
              disabled={pending || open === false}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {open === "approve" ? "Ya, setujui" : "Minta revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
