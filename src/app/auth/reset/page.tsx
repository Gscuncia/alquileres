import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/design-system";

interface ResetPageProps {
  searchParams: { token?: string };
}

export default async function ResetPage({ searchParams }: ResetPageProps) {
  const token = searchParams.token;

  if (!token) {
    redirect("/auth/recover");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  const isValid =
    resetToken !== null && resetToken.expiresAt >= new Date();

  if (!isValid) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-section">
        <div className="w-full max-w-md rounded-md border border-hairline bg-surface-card p-8 shadow-card">
          <h1 className="text-display-sm font-semibold text-ink">
            Enlace inválido
          </h1>
          <p className="mt-2 text-body-sm text-muted">
            El enlace de recuperación es inválido o expiró.
          </p>
          <div className="mt-6">
            <Button asChild block>
              <Link href="/auth/recover">Solicitar un nuevo enlace</Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-section">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface-card p-8 shadow-card">
        <h1 className="text-display-sm font-semibold text-ink">
          Nueva contraseña
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          Ingresá una nueva contraseña para tu cuenta.
        </p>

        <ResetPasswordForm token={token} />
      </div>
    </main>
  );
}
