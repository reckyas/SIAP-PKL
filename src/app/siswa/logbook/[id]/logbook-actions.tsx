"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send, Trash2 } from "lucide-react";
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
import type { LogbookStatus } from "@prisma/client";
import { deleteLogbookAction, submitLogbookAction } from "../actions";

interface LogbookActionsProps {
  id: string;
  status: LogbookStatus;
  canSubmit: boolean;
  canDelete: boolean;
}

export function LogbookActions({
  id,
  status,
  canSubmit,
  canDelete,
}: LogbookActionsProps) {
  const router = useRouter();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleSubmit() {
    start(async () => {
      const res = await submitLogbookAction(id);
      if (res.ok) {
        toast.success("Logbook dikirim ke guru.");
        setSubmitOpen(false);
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal mengirim.");
      }
    });
  }

  function handleDelete() {
    start(async () => {
      const res = await deleteLogbookAction(id);
      if (res.ok) {
        toast.success("Logbook dihapus.");
        router.push("/siswa/logbook");
        router.refresh();
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

  if (!canSubmit && !canDelete) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canSubmit && (
          <Button onClick={() => setSubmitOpen(true)} disabled={pending}>
            <Send className="h-4 w-4" />
            {status === "REVISED" ? "Kirim ulang" : "Kirim ke guru"}
          </Button>
        )}
        {canDelete && (
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" />
            Hapus draf
          </Button>
        )}
      </div>

      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kirim logbook ke guru?</DialogTitle>
            <DialogDescription>
              Setelah dikirim, entry ini tidak bisa diedit sampai guru
              memberi revisi (jika perlu).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleSubmit} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ya, kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus draf logbook?</DialogTitle>
            <DialogDescription>
              Entry ini akan dihapus permanen. Aksi tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
