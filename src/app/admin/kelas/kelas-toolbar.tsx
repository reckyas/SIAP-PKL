"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KelasDialog } from "./kelas-dialog";

interface KelasToolbarProps {
  jurusan: { id: string; kode: string; nama: string }[];
}

export function KelasToolbar({ jurusan }: KelasToolbarProps) {
  const [open, setOpen] = useState(false);

  const disabled = jurusan.length === 0;

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        <Plus className="h-4 w-4" />
        Tambah Kelas
      </Button>
      <KelasDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        jurusan={jurusan}
      />
    </>
  );
}
