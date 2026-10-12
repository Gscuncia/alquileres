"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";

interface GuestFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    phone: string;
    email: string;
    notes: string;
  };
  submitLabel?: string;
}

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption-sm text-primary-error-text">{message}</p>;
}

export function GuestForm({
  action,
  initialValues,
  submitLabel = "Guardar",
}: GuestFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      {state.ok && (
        <div
          role="status"
          className="rounded-sm border border-hairline bg-sky px-4 py-3 text-body-sm text-ink"
        >
          Los cambios se guardaron correctamente.
        </div>
      )}
      {!state.ok && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          {state.message}
        </div>
      )}
      {initialValues && <input type="hidden" name="id" value={initialValues.id} />}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClasses}>
            Nombre
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={initialValues?.firstName ?? ""}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.firstName} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClasses}>
            Apellido
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={initialValues?.lastName ?? ""}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.lastName} />
        </div>
        <div>
          <label htmlFor="dni" className={labelClasses}>
            DNI
          </label>
          <input
            id="dni"
            name="dni"
            type="text"
            inputMode="numeric"
            defaultValue={initialValues?.dni ?? ""}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.dni} />
        </div>
        <div>
          <label htmlFor="phone" className={labelClasses}>
            Teléfono
          </label>
          <input
            id="phone"
            name="phone"
            type="text"
            defaultValue={initialValues?.phone ?? ""}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div>
          <label htmlFor="email" className={labelClasses}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="text"
            defaultValue={initialValues?.email ?? ""}
            className={inputClasses}
          />
          <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
          <FieldError message={fieldErrors.email} />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className={labelClasses}>
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
          className={inputClasses}
        />
        <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
        <FieldError message={fieldErrors.notes} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
