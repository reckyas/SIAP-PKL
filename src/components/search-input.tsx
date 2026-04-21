"use client";

/**
 * Input pencarian yang sync ke query string `?q=` dengan debounce ringan.
 * Dipakai di halaman-halaman daftar admin.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface SearchInputProps {
  placeholder?: string;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = "Cari…",
  debounceMs = 350,
  className,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  useEffect(() => {
    const h = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (value === current) return;
      const p = new URLSearchParams(params.toString());
      if (value) p.set("q", value);
      else p.delete("q");
      p.delete("page");
      router.replace(`${pathname}?${p.toString()}`);
    }, debounceMs);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, debounceMs, pathname]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-8"
        type="search"
      />
    </div>
  );
}
