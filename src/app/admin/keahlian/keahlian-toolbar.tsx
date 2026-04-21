"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { KeahlianDialog } from "./keahlian-dialog";

export function KeahlianToolbar() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline">
        <Link href="/admin/keahlian/import">
          <Upload className="h-4 w-4" />
          Import
        </Link>
      </Button>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Tambah Keahlian
      </Button>
      <KeahlianDialog open={open} onOpenChange={setOpen} mode="create" />
    </div>
  );
}
