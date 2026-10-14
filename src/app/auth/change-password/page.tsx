import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

export default async function ChangePasswordPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mustChangePassword: true },
  });

  if (dbUser?.mustChangePassword !== true) {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-section">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface-card p-8 shadow-card">
        <h1 className="text-display-sm font-semibold text-ink">
          Cambiar contraseña
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          Es necesario que cambies tu contraseña temporal antes de continuar.
        </p>
        <ChangePasswordForm />
      </div>
    </main>
  );
}
