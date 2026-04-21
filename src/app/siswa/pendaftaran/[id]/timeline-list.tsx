import type { Role, StatusPendaftaran } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_VARIANT } from "../status";

interface TimelineEntry {
  id: string;
  status: StatusPendaftaran;
  catatan: string | null;
  aktorRole: Role;
  createdAt: Date;
}

interface TimelineListProps {
  entries: TimelineEntry[];
}

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Admin",
  GURU_PEMBIMBING: "Guru",
  SISWA: "Siswa",
  DUDI: "DU/DI",
};

export function TimelineList({ entries }: TimelineListProps) {
  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Belum ada event.</p>
    );
  }

  return (
    <ol className="relative ml-3 space-y-4 border-l pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[e.status]}>
              {STATUS_LABEL[e.status]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              oleh {ROLE_LABEL[e.aktorRole]} · {fmt.format(e.createdAt)}
            </span>
          </div>
          {e.catatan && (
            <p className="mt-1 whitespace-pre-wrap text-sm">{e.catatan}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
