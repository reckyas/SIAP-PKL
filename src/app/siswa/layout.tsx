import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/session";
import { getShellContext } from "@/lib/shell-context";
import { CHANGE_PASSWORD_PATH } from "@/lib/constants";

export default async function SiswaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["SISWA"]);
  const ctx = await getShellContext(session.user.id, "SISWA");
  if (ctx.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);

  return (
    <AppShell
      role="SISWA"
      user={{ name: ctx.name, email: ctx.email, avatarUrl: ctx.avatarUrl }}
    >
      {children}
    </AppShell>
  );
}
