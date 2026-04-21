"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, X } from "lucide-react";
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
import { guruDecideAction } from "./actions";

interface GuruDecisionDialogProps {
  pendaftaranId: string;
  siswaNama: string;
  lowonganJudul: string;
}

export function GuruDecisionDialog({
  pendaftaranId,
  siswaNama,
  lowonganJudul,
}: GuruDecisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState<false | "approve" | "reject">(false);
  const [catatan, setCatatan] = useState("");
  const [pending, start] = useTransition();

  function submit(approve: boolean) {
    start(async () => {
      const res = await guruDecideAction({
        pendaftaranId,
        approve,
        catatan: catatan.trim(),
      });
      if (res.ok) {
        toast.success(
          approve
            ? "Pendaftaran disetujui dan diteruskan ke DU/DI."
            : "Pendaftaran ditolak.",
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
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => setOpen("approve")}
          disabled={pending}
        >
          <Check className="h-4 w-4" />
          Setujui
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => setOpen("reject")}
          disabled={pending}
        >
          <X className="h-4 w-4" />
          Tolak
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
              {open === "approve"
                ? "Setujui pendaftaran?"
                : "Tolak pendaftaran?"}
            </DialogTitle>
            <DialogDescription>
              {siswaNama} → {lowonganJudul}.{" "}
              {open === "approve"
                ? "Setelah disetujui, pendaftaran diteruskan ke DU/DI untuk review."
                : "Pendaftaran akan ditutup dan siswa diberi tahu."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="catatan">
              Catatan untuk siswa {open === "reject" && "(disarankan)"}
            </Label>
            <Textarea
              id="catatan"
              rows={4}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={
                open === "approve"
                  ? "Opsional, mis. pesan motivasi."
                  : "Jelaskan alasan penolakan supaya siswa bisa memperbaiki."
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
              {open === "approve" ? "Ya, setujui" : "Ya, tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
