"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { JurusanDialog } from "./jurusan-dialog";

export function JurusanToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah Jurusan
      </Button>
      <JurusanDialog
        open={open}
        onOpenChange={setOpen}
        mode="create"
      />
    </>
  );
}
