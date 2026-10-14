"use client";

import { changePassword } from "@/app/auth/change-password/actions";
import { AdminChangePasswordForm } from "@/components/admin/AdminChangePasswordForm";

export function MustChangePasswordModal() {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="must-change-title"
    >
      <div className="w-full max-w-md rounded-lg border border-hairline bg-canvas p-6 shadow-xl">
        <h2
          id="must-change-title"
          className="text-title-md font-semibold text-ink"
        >
          Cambiar contraseña
        </h2>
        <p className="mt-1 text-body-sm text-muted">
          Es la primera vez que ingresás. Tenés que cambiar tu contraseña para
          continuar.
        </p>
        <div className="mt-6">
          <AdminChangePasswordForm action={changePassword} />
        </div>
      </div>
    </div>
  );
}
