"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, XCircle } from "lucide-react";
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
import { batalkanPendaftaranAction } from "../actions";

interface BatalkanPendaftaranButtonProps {
  id: string;
}

export function BatalkanPendaftaranButton({
  id,
}: BatalkanPendaftaranButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleCancel() {
    start(async () => {
      const res = await batalkanPendaftaranAction(id);
      if (res.ok) {
        toast.success("Pendaftaran dibatalkan.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal membatalkan.");
      }
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        <XCircle className="h-4 w-4" />
        Batalkan pendaftaran
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan pendaftaran?</DialogTitle>
            <DialogDescription>
              Pendaftaran akan ditandai sebagai dibatalkan. Anda masih bisa
              daftar ke lowongan lain setelahnya.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Tutup
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
