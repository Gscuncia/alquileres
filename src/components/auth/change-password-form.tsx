"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/design-system";
import { changePassword } from "@/app/auth/change-password/actions";

export function ChangePasswordForm() {
  const [state, formAction] = useFormState(changePassword, { ok: false });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {!state.ok && state.message && (
        <p
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          {state.message}
        </p>
      )}
      <div>
        <label
          htmlFor="currentPassword"
          className="block text-caption-sm font-medium text-ink"
        >
          Contraseña actual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-sm border border-hairline bg-canvas px-3 py-3 text-body-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary"
        />
        {state.fieldErrors?.currentPassword && (
          <p className="mt-1 text-caption-sm text-primary-error-text">
            {state.fieldErrors.currentPassword}
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="newPassword"
          className="block text-caption-sm font-medium text-ink"
        >
          Nueva contraseña
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          className="mt-1 w-full rounded-sm border border-hairline bg-canvas px-3 py-3 text-body-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary"
        />
        {state.fieldErrors?.newPassword && (
          <p className="mt-1 text-caption-sm text-primary-error-text">
            {state.fieldErrors.newPassword}
          </p>
        )}
      </div>
      <Button type="submit" block>
        Guardar contraseña
      </Button>
    </form>
  );
}
