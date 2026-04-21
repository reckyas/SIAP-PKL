"use client";

/**
 * Shell utama untuk halaman setelah login.
 *
 * Struktur:
 *   - Sidebar kiri (desktop) / drawer (mobile) berisi nav sesuai role.
 *   - Topbar dengan hamburger (mobile), theme toggle, user menu.
 *   - <main> untuk konten halaman.
 *
 * Disiapkan sebagai client component supaya mobile drawer + active-state
 * (usePathname) berjalan. Data session dipass dari server layout.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Sparkles, X } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { NAV_BY_ROLE } from "@/lib/nav";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Role } from "@prisma/client";

interface AppShellProps {
  role: Role;
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  children: React.ReactNode;
}

export function AppShell({ role, user, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar — desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <SidebarInner
          role={role}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
        />
      </aside>

      {/* Drawer — mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          />
          <aside className="relative z-10 h-full w-72 border-r bg-background shadow-xl">
            <div className="flex items-center justify-end p-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Tutup menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SidebarInner
              role={role}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium text-muted-foreground lg:hidden">
            SIAP PKL
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserNav
              name={user.name}
              email={user.email}
              role={role}
              avatarUrl={user.avatarUrl ?? null}
            />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

interface SidebarInnerProps {
  role: Role;
  pathname: string;
  onNavigate: () => void;
}

function SidebarInner({ role, pathname, onNavigate }: SidebarInnerProps) {
  const sections = NAV_BY_ROLE[role];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">SIAP PKL</div>
          <div className="text-xs text-muted-foreground">
            {ROLE_LABEL[role]}
          </div>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </div>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== `/${role.toLowerCase()}` &&
                    pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
