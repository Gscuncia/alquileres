"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/design-system";
import { requestPasswordReset } from "@/app/auth/recover/actions";

export function RecoverForm() {
  const [state, formAction] = useFormState(requestPasswordReset, { ok: false });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.ok ? (
        <p
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-ink"
        >
          {state.message}
        </p>
      ) : (
        <>
          {state.message && (
            <p
              role="alert"
              className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
            >
              {state.message}
            </p>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-caption-sm font-medium text-ink"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-1 w-full rounded-sm border border-hairline bg-canvas px-3 py-3 text-body-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary"
            />
            {state.fieldErrors?.email && (
              <p className="mt-1 text-caption-sm text-primary-error-text">
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          <Button type="submit" block>
            Enviar enlace
          </Button>
        </>
      )}
    </form>
  );
}
