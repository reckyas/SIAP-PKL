"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SAWDialog } from "./saw-dialog";

interface SAWToolbarProps {
  jurusan: { id: string; kode: string; nama: string }[];
}

export function SAWToolbar({ jurusan }: SAWToolbarProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah preset
      </Button>
      <SAWDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
        jurusan={jurusan}
      />
    </>
  );
}
