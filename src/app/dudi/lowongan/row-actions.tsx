"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Send,
  Lock,
  Trash2,
} from "lucide-react";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  closeLowonganAction,
  deleteLowonganAction,
  publishLowonganAction,
} from "./actions";

type Status = "DRAFT" | "OPEN" | "CLOSED" | "FULL";

interface LowonganRowActionsProps {
  id: string;
  judul: string;
  status: Status;
  pendaftarCount: number;
}

export function LowonganRowActions({
  id,
  judul,
  status,
  pendaftarCount,
}: LowonganRowActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [pending, start] = useTransition();

  const canEdit = status !== "CLOSED";
  const canPublish = status === "DRAFT";
  const canClose = status === "OPEN" || status === "FULL";
  const canDelete = status === "DRAFT" && pendaftarCount === 0;

  function handlePublish() {
    start(async () => {
      const res = await publishLowonganAction(id);
      if (res.ok) toast.success(`Lowongan ${judul} dipublikasi.`);
      else toast.error(res.error ?? "Gagal publikasi.");
    });
  }

  function handleClose() {
    start(async () => {
      const res = await closeLowonganAction(id);
      if (res.ok) {
        toast.success(`Lowongan ${judul} ditutup.`);
        setCloseOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menutup.");
      }
    });
  }

  function handleDelete() {
    start(async () => {
      const res = await deleteLowonganAction(id);
      if (res.ok) {
        toast.success(`Lowongan ${judul} dihapus.`);
        setDeleteOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Aksi">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canEdit && (
            <DropdownMenuItem asChild>
              <Link href={`/dudi/lowongan/${id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
          )}
          {canPublish && (
            <DropdownMenuItem onClick={handlePublish} disabled={pending}>
              <Send className="h-4 w-4" />
              Publikasi
            </DropdownMenuItem>
          )}
          {canClose && (
            <DropdownMenuItem onClick={() => setCloseOpen(true)}>
              <Lock className="h-4 w-4" />
              Tutup
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutup lowongan</DialogTitle>
            <DialogDescription>
              Lowongan <strong>{judul}</strong> akan ditutup. Siswa tidak lagi
              bisa mendaftar, tapi pendaftar yang sudah ada tetap diproses.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCloseOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button onClick={handleClose} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tutup lowongan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus lowongan</DialogTitle>
            <DialogDescription>
              Lowongan <strong>{judul}</strong> akan dihapus permanen. Aksi ini
              tidak bisa dibatalkan.
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
