import Link from "next/link";
import { Sparkles } from "lucide-react";

import { ChangePasswordForm } from "./change-password-form";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Ganti Password" };

export default async function ChangePasswordPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });
  const forced = user?.mustChangePassword ?? false;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">SIAP PKL</div>
          </Link>
        </div>
      </header>
      <main className="container flex flex-1 items-center justify-center py-10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {forced ? "Ganti password wajib" : "Ganti password"}
            </CardTitle>
            <CardDescription>
              {forced
                ? "Akun Anda baru dibuat oleh admin. Silakan ganti password sebelum melanjutkan."
                : "Ubah password akun Anda. Pastikan password baru tidak dipakai di tempat lain."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm forced={forced} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
