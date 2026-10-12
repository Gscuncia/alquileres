import Link from "next/link";
import { SignOutButton } from "@/components/auth/signout-button";

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <h1 className="text-display-md font-bold text-ink">Acceso denegado</h1>
      <p className="mt-3 max-w-md text-body-md text-body">
        No tenés permiso para acceder al panel de administración.
      </p>
      <div className="mt-6 flex items-center gap-4">
        <Link
          href="/"
          className="text-button-md font-medium text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        >
          Volver al inicio
        </Link>
        <SignOutButton />
      </div>
    </div>
  );
}
