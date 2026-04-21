"use client";

import Link from "next/link";
import { useTransition } from "react";
import { LogOut, UserCircle2, KeyRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABEL, CHANGE_PASSWORD_PATH } from "@/lib/constants";
import { signOutAction } from "@/app/(auth)/actions";
import type { Role } from "@prisma/client";

interface UserNavProps {
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
}

export function UserNav({ name, email, role, avatarUrl }: UserNavProps) {
  const [pending, start] = useTransition();

  const profilHref = profilPathByRole(role);
  const initials = (name || email || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-9 gap-2 px-2"
          aria-label="Menu akun"
        >
          <Avatar className="h-7 w-7">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
            <AvatarFallback>{initials || "?"}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="text-sm">{name}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {email}
          </div>
          <div className="text-xs font-normal text-muted-foreground">
            {ROLE_LABEL[role]}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={profilHref}>
            <UserCircle2 className="h-4 w-4" />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={CHANGE_PASSWORD_PATH}>
            <KeyRound className="h-4 w-4" />
            Ganti Password
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            start(() => signOutAction());
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function profilPathByRole(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin/profil";
    case "GURU_PEMBIMBING":
      return "/guru/profil";
    case "SISWA":
      return "/siswa/profil";
    case "DUDI":
      return "/dudi/profil";
  }
}
