"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <form action={() => start(() => signOutAction())}>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <LogOut className="h-4 w-4" />
        Keluar
      </Button>
    </form>
  );
}
