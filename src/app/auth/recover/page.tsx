import { RecoverForm } from "@/components/auth/recover-form";

export default function RecoverPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-section">
      <div className="w-full max-w-md rounded-md border border-hairline bg-surface-card p-8 shadow-card">
        <h1 className="text-display-sm font-semibold text-ink">
          Recuperar contraseña
        </h1>
        <p className="mt-2 text-body-sm text-muted">
          Ingresá tu email y te enviaremos un enlace para restablecerla.
        </p>

        <RecoverForm />
      </div>
    </main>
  );
}
