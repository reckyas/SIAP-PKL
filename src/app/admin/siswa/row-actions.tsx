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
import { deleteSiswaAction, resetSiswaPasswordAction } from "./actions";

interface SiswaRowActionsProps {
  siswaId: string;
  nama: string;
}

export function SiswaRowActions({ siswaId, nama }: SiswaRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      const res = await deleteSiswaAction(siswaId);
      if (res.ok) {
        toast.success(`Siswa ${nama} dihapus.`);
        setDeleteOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

  function handleReset() {
    start(async () => {
      const res = await resetSiswaPasswordAction(siswaId);
      if (res.ok) {
        toast.success(
          `Password ${nama} direset. User harus ganti password saat login.`,
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
            <DialogTitle>Hapus siswa</DialogTitle>
            <DialogDescription>
              Siswa <strong>{nama}</strong> akan dihapus (soft delete). Akun
              tidak bisa login lagi. Data pendaftaran & logbook tetap tersimpan
              sebagai arsip.
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
            <DialogTitle>Reset password siswa</DialogTitle>
            <DialogDescription>
              Password <strong>{nama}</strong> akan direset ke NIS. Siswa akan
              dipaksa mengganti password saat login berikutnya.
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
