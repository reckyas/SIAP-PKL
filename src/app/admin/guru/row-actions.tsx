"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, KeyRound, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteGuruAction, resetGuruPasswordAction } from "./actions";

interface GuruRowActionsProps {
  guruId: string;
  nama: string;
  jumlahBimbingan: number;
}

export function GuruRowActions({
  guruId,
  nama,
  jumlahBimbingan,
}: GuruRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      const res = await deleteGuruAction(guruId);
      if (res.ok) {
        toast.success(`Guru ${nama} dihapus.`);
        setDeleteOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

  function handleReset() {
    start(async () => {
      const res = await resetGuruPasswordAction(guruId);
      if (res.ok) {
        toast.success(
          `Password ${nama} direset. User dipaksa ganti saat login.`,
        );
        setResetOpen(false);
      } else {
        toast.error(res.error ?? "Gagal reset password.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Menu aksi">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setResetOpen(true)}>
            <KeyRound className="h-4 w-4" />
            Reset password
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus guru</DialogTitle>
            <DialogDescription>
              Guru <strong>{nama}</strong> akan dihapus.
              {jumlahBimbingan > 0 && (
                <>
                  {" "}
                  <span className="text-amber-600">
                    {jumlahBimbingan} siswa bimbingan akan dilepas (status guru
                    jadi kosong) — siswa tersebut perlu ditugaskan ke guru lain.
                  </span>
                </>
              )}
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

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password guru</DialogTitle>
            <DialogDescription>
              Password <strong>{nama}</strong> akan direset (default = NIP,
              atau <code>guru12345</code> kalau NIP pendek/kosong). Guru dipaksa
              ganti password saat login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleReset} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reset password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
