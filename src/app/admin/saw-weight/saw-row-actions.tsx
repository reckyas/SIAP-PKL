"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
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
import { SAWDialog, type SAWDialogData } from "./saw-dialog";
import {
  deleteSAWWeightAction,
  setActiveSAWWeightAction,
} from "./actions";

interface SAWRowActionsProps {
  data: SAWDialogData;
  jurusan: { id: string; kode: string; nama: string }[];
}

export function SAWRowActions({ data, jurusan }: SAWRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleToggle() {
    start(async () => {
      const res = await setActiveSAWWeightAction(data.id, !data.isActive);
      if (res.ok) {
        toast.success(
          data.isActive ? "Bobot dinonaktifkan." : "Bobot diaktifkan.",
        );
      } else {
        toast.error(res.error ?? "Gagal mengubah status.");
      }
    });
  }

  function handleDelete() {
    start(async () => {
      const res = await deleteSAWWeightAction(data.id);
      if (res.ok) {
        toast.success(`Bobot ${data.nama} dihapus.`);
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
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggle} disabled={pending}>
            {data.isActive ? (
              <>
                <PowerOff className="h-4 w-4" />
                Nonaktifkan
              </>
            ) : (
              <>
                <Power className="h-4 w-4" />
                Aktifkan
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SAWDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        data={data}
        jurusan={jurusan}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus bobot SAW</DialogTitle>
            <DialogDescription>
              Preset <strong>{data.nama}</strong> akan dihapus permanen.
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
