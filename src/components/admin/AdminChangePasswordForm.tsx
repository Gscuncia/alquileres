"use client";

import { useFormState } from "react-dom";
import { changePassword } from "@/app/admin/cambiar-contrasena/actions";
import { AdminField, AdminInput } from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

export function AdminChangePasswordForm() {
  const [state, formAction] = useFormState(changePassword, { ok: false });

  return (
    <form action={formAction} className="space-y-4">
      {!state.ok && state.message && (
        <p
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          {state.message}
        </p>
      )}

      <AdminField label="Contraseña actual" htmlFor="currentPassword">
        <AdminInput
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </AdminField>

      <AdminField label="Nueva contraseña" htmlFor="newPassword">
        <AdminInput
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </AdminField>

      <AdminField label="Confirmar nueva contraseña" htmlFor="confirmPassword">
        <AdminInput
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
        />
      </AdminField>

      {state.fieldErrors && (
        <div className="space-y-1">
          {Object.entries(state.fieldErrors).map(([field, message]) => (
            <p
              key={field}
              className="text-caption-sm text-primary-error-text"
            >
              {message}
            </p>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit">Guardar contraseña</Button>
      </div>
    </form>
  );
}
