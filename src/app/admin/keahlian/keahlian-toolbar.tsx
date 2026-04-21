"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeahlianDialog } from "./keahlian-dialog";

export function KeahlianToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah Keahlian
      </Button>
      <KeahlianDialog open={open} onOpenChange={setOpen} mode="create" />
    </>
  );
}
