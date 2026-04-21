import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/session";
import { getShellContext } from "@/lib/shell-context";
import { CHANGE_PASSWORD_PATH } from "@/lib/constants";

export default async function DudiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole(["DUDI"]);
  const ctx = await getShellContext(session.user.id, "DUDI");
  if (ctx.mustChangePassword) redirect(CHANGE_PASSWORD_PATH);

  return (
    <AppShell
      role="DUDI"
      user={{ name: ctx.name, email: ctx.email, avatarUrl: ctx.avatarUrl }}
    >
      {children}
    </AppShell>
  );
}
