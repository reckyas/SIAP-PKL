"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DokumenDialog } from "./dokumen-dialog";

export function DokumenToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah Dokumen
      </Button>
      <DokumenDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
