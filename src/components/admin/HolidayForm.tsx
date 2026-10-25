"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";

interface HolidayFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: {
    id: string;
    /** `YYYY-MM-DD` in Buenos Aires local time. */
    date: string;
    notes: string;
  };
  submitLabel?: string;
}

export function HolidayForm({
  action,
  initialValues,
  submitLabel = "Guardar",
}: HolidayFormProps) {
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
      {initialValues && (
        <input type="hidden" name="id" value={initialValues.id} />
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminField label="Fecha" htmlFor="date" error={state.fieldErrors?.date}>
          <AdminInput
            id="date"
            name="date"
            type="date"
            defaultValue={initialValues?.date ?? ""}
          />
        </AdminField>
      </div>
      <AdminField
        label="Observaciones"
        htmlFor="notes"
        error={state.fieldErrors?.notes}
      >
        <AdminInput
          as="textarea"
          id="notes"
          name="notes"
          rows={2}
          defaultValue={initialValues?.notes ?? ""}
        />
      </AdminField>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
