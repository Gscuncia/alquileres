"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";

interface ExpenseTypeFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: {
    id: string;
    name: string;
    /** Empty for general expenses (never persisted with a property). */
    requiresProperty?: boolean | null;
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

export function ExpenseTypeForm({
  action,
  initialValues,
  submitLabel = "Guardar",
}: ExpenseTypeFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });

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
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelClasses}>
            Nombre
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Mantenimiento"
            defaultValue={initialValues?.name ?? ""}
            className={inputClasses}
          />
          <FieldError message={state.fieldErrors?.name} />
        </div>
        <div>
          <span className={labelClasses}>Propiedad</span>
          <label
            htmlFor="requiresProperty"
            className="flex items-center gap-2 text-body-sm text-body"
          >
            <input
              id="requiresProperty"
              name="requiresProperty"
              type="checkbox"
              defaultChecked={initialValues?.requiresProperty ?? false}
              className="h-4 w-4 rounded-sm border-hairline"
            />
            Requiere propiedad
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
