"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { slugifyBidang } from "@/lib/bidang";
import {
  createBidangAction,
  type BidangItem,
} from "@/app/api/bidang/actions";

interface BidangPickerProps {
  value: string[];
  onChange: (ids: string[]) => void;
  master: BidangItem[];
  maxItems?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function BidangPicker({
  value,
  onChange,
  master,
  maxItems = 10,
  placeholder = "Ketik untuk cari / tambah bidang…",
  disabled,
}: BidangPickerProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [localMaster, setLocalMaster] = useState<BidangItem[]>(master);
  const inputRef = useRef<HTMLInputElement>(null);

  const masterById = useMemo(
    () => new Map(localMaster.map((b) => [b.id, b])),
    [localMaster],
  );

  const selected = useMemo(
    () => value.map((id) => masterById.get(id)).filter((b): b is BidangItem => !!b),
    [value, masterById],
  );

  const suggestions = useMemo(() => {
    const q = slugifyBidang(input);
    if (!q) return [];
    const selectedSet = new Set(value);
    return localMaster
      .filter((b) => !selectedSet.has(b.id))
      .filter((b) => b.slug.includes(q))
      .slice(0, 8);
  }, [input, localMaster, value]);

  const exactMatch = useMemo(() => {
    const q = slugifyBidang(input);
    if (!q) return null;
    return localMaster.find((b) => b.slug === q) ?? null;
  }, [input, localMaster]);

  function addId(id: string) {
    if (value.includes(id)) return;
    if (value.length >= maxItems) {
      toast.error(`Maksimal ${maxItems} bidang.`);
      return;
    }
    onChange([...value, id]);
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  function handleCreate() {
    const nama = input.trim();
    if (!nama) return;
    if (exactMatch) {
      addId(exactMatch.id);
      return;
    }
    if (value.length >= maxItems) {
      toast.error(`Maksimal ${maxItems} bidang.`);
      return;
    }
    start(async () => {
      const res = await createBidangAction({ nama });
      if (!res.ok || !res.bidang) {
        toast.error(res.error ?? "Gagal menambah bidang.");
        return;
      }
      const b = res.bidang;
      setLocalMaster((prev) =>
        prev.some((x) => x.id === b.id) ? prev : [...prev, b],
      );
      addId(b.id);
    });
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[0] && !exactMatch) {
        addId(suggestions[0].id);
      } else {
        handleCreate();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((b) => (
            <Badge key={b.id} variant="secondary" className="gap-1">
              {b.nama}
              <button
                type="button"
                onClick={() => remove(b.id)}
                disabled={disabled}
                className="rounded-full hover:bg-destructive/20"
                aria-label={`Hapus ${b.nama}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            disabled={disabled || pending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCreate}
            disabled={disabled || pending || !input.trim()}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : exactMatch ? (
              <Check className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {exactMatch ? "Pilih" : "Tambah"}
          </Button>
        </div>
        {open && input.trim() && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
            {suggestions.length > 0 ? (
              <ul className="max-h-60 overflow-auto py-1">
                {suggestions.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addId(b.id);
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-accent"
                    >
                      <span>{b.nama}</span>
                      <span className="text-xs text-muted-foreground">
                        dari master
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Tidak ada hasil. Tekan Enter / klik Tambah untuk menambahkan
                &ldquo;{input.trim()}&rdquo; ke master.
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Bidang baru otomatis masuk ke master supaya bisa dicocokkan dengan siswa
        / lowongan lain.
      </p>
    </div>
  );
}
