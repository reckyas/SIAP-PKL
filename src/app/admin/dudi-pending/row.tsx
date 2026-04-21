"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, ExternalLink, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TableCell, TableRow } from "@/components/ui/table";
import { approveDudiAction, rejectDudiAction } from "./actions";

interface DudiPendingRowProps {
  userId: string;
  email: string;
  createdAt: Date;
  dudi: {
    namaPerusahaan: string;
    alamat: string;
    namaPIC: string;
    noHpPIC: string;
    bidangUsaha: string[];
    websiteUrl: string | null;
    latitude: number;
    longitude: number;
  } | null;
}

export function DudiPendingRow({
  userId,
  email,
  createdAt,
  dudi,
}: DudiPendingRowProps) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [pending, start] = useTransition();

  function onApprove() {
    start(async () => {
      const res = await approveDudiAction(userId);
      if (res.ok) toast.success("Akun DU/DI disetujui.");
      else toast.error(res.error ?? "Gagal menyetujui.");
    });
  }

  function onReject() {
    start(async () => {
      const res = await rejectDudiAction(userId, alasan);
      if (res.ok) {
        toast.success("Akun DU/DI ditolak.");
        setRejectOpen(false);
        setAlasan("");
      } else {
        toast.error(res.error ?? "Gagal menolak.");
      }
    });
  }

  return (
    <>
      <TableRow>
        <TableCell className="max-w-[260px]">
          <div className="font-medium">{dudi?.namaPerusahaan ?? "—"}</div>
          <div className="truncate text-xs text-muted-foreground">{email}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {dudi?.alamat ?? "—"}
          </div>
          {dudi?.websiteUrl && (
            <a
              href={dudi.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Website
            </a>
          )}
        </TableCell>
        <TableCell className="text-sm">
          <div>{dudi?.namaPIC ?? "—"}</div>
          <div className="text-xs text-muted-foreground">
            {dudi?.noHpPIC ?? "—"}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {dudi?.bidangUsaha?.length
              ? dudi.bidangUsaha.slice(0, 4).map((b) => (
                  <Badge key={b} variant="outline" className="text-[10px]">
                    {b}
                  </Badge>
                ))
              : "—"}
            {dudi && dudi.bidangUsaha.length > 4 && (
              <Badge variant="secondary" className="text-[10px]">
                +{dudi.bidangUsaha.length - 4}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">
          {formatDate(createdAt)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={onApprove}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Setujui
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectOpen(true)}
              disabled={pending}
            >
              <X className="h-4 w-4" />
              Tolak
            </Button>
          </div>
        </TableCell>
      </TableRow>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak pendaftaran DU/DI</DialogTitle>
            <DialogDescription>
              Akun {dudi?.namaPerusahaan ?? email} akan ditandai sebagai
              REJECTED dan tidak bisa login. Alasan akan dikirim ke email /
              notifikasi user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Alasan (opsional, maks 500 karakter)
            </label>
            <Textarea
              value={alasan}
              onChange={(e) => setAlasan(e.target.value.slice(0, 500))}
              placeholder="Contoh: data perusahaan tidak valid, duplikat, dll."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={onReject}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Tolak pendaftaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}
