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
import { KeahlianDialog, type KeahlianDialogData } from "./keahlian-dialog";
import { deleteKeahlianAction } from "./actions";

interface KeahlianRowActionsProps {
  data: KeahlianDialogData;
  usage: number;
}

export function KeahlianRowActions({ data, usage }: KeahlianRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, start] = useTransition();

  const canDelete = usage === 0;

  function handleDelete() {
    start(async () => {
      const res = await deleteKeahlianAction(data.id);
      if (res.ok) {
        toast.success(`Keahlian ${data.nama} dihapus.`);
        setDeleteOpen(false);
      } else {
        toast.error(res.error ?? "Gagal menghapus.");
      }
    });
  }

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
        title={!canDelete ? "Masih dipakai" : undefined}
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <KeahlianDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        data={data}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus keahlian</DialogTitle>
            <DialogDescription>
              Keahlian <strong>{data.nama}</strong> akan dihapus permanen.
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
