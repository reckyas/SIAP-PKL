"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JurusanDialog, type JurusanDialogData } from "./jurusan-dialog";
import { deleteJurusanAction } from "./actions";

interface JurusanRowActionsProps {
  data: JurusanDialogData;
  jumlahSiswa: number;
}

export function JurusanRowActions({
  data,
  jumlahSiswa,
}: JurusanRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  function handleDelete() {
    start(async () => {
      const res = await deleteJurusanAction(data.id);
      if (res.ok) {
        toast.success(`Jurusan ${data.kode} dihapus.`);
        setDeleteOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

  const canDelete = jumlahSiswa === 0;

  return (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditOpen(true)}
        aria-label="Edit"
      >
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDeleteOpen(true)}
        aria-label="Hapus"
        disabled={!canDelete}
        title={!canDelete ? "Masih dipakai siswa" : undefined}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <JurusanDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        data={data}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus jurusan</DialogTitle>
            <DialogDescription>
              Jurusan <strong>{data.kode} — {data.nama}</strong> akan dihapus
              permanen. Tindakan ini tidak bisa dibatalkan.
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
    </div>
  );
}
