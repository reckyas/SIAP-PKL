"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StatusLowongan } from "@prisma/client";

const ALL = "__ALL__";

interface StatusFilterProps {
  current: StatusLowongan | null;
}

export function StatusFilter({ current }: StatusFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setStatus(value: string) {
    const p = new URLSearchParams(params.toString());
    if (value === ALL) p.delete("status");
    else p.set("status", value);
    p.delete("page");
    router.replace(`${pathname}?${p.toString()}`);
  }

  return (
    <Select value={current ?? ALL} onValueChange={setStatus}>
      <SelectTrigger className="w-[140px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>Semua status</SelectItem>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="OPEN">Terbuka</SelectItem>
        <SelectItem value="CLOSED">Ditutup</SelectItem>
        <SelectItem value="FULL">Penuh</SelectItem>
      </SelectContent>
    </Select>
  );
}
