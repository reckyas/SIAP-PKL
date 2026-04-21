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
import { dudiDecideAction } from "../actions";

interface DudiDecisionDialogProps {
  pendaftaranId: string;
  siswaNama: string;
  lowonganJudul: string;
}

export function DudiDecisionDialog({
  pendaftaranId,
  siswaNama,
  lowonganJudul,
}: DudiDecisionDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState<false | "accept" | "reject">(false);
  const [catatan, setCatatan] = useState("");
  const [pending, start] = useTransition();

  function submit(terima: boolean) {
    start(async () => {
      const res = await dudiDecideAction({
        pendaftaranId,
        terima,
        catatan: catatan.trim(),
      });
      if (res.ok) {
        toast.success(
          terima
            ? "Siswa diterima. Kuota lowongan diperbarui otomatis."
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
      <div className="flex w-full gap-2">
        <Button
          className="flex-1"
          size="sm"
          onClick={() => setOpen("accept")}
          disabled={pending}
        >
          <Check className="h-4 w-4" />
          Terima
        </Button>
        <Button
          className="flex-1"
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
              {open === "accept" ? "Terima siswa ini?" : "Tolak pendaftaran?"}
            </DialogTitle>
            <DialogDescription>
              {siswaNama} → {lowonganJudul}.{" "}
              {open === "accept"
                ? "Siswa langsung berstatus DITERIMA, kuota lowongan bertambah, dan pendaftaran siswa ini di lowongan lain akan dibatalkan otomatis."
                : "Pendaftaran ditutup; siswa bisa mendaftar ke lowongan lain."}
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
                open === "accept"
                  ? "Opsional, mis. info kapan mulai, siapa PIC."
                  : "Jelaskan alasan penolakan."
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
              variant={open === "accept" ? "default" : "destructive"}
              onClick={() => submit(open === "accept")}
              disabled={pending || open === false}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {open === "accept" ? "Ya, terima" : "Ya, tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
