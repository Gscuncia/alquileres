"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

interface RecipientFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: { id: string; name: string };
  submitLabel?: string;
}

export function RecipientForm({
  action,
  initialValues,
  submitLabel = "Guardar",
}: RecipientFormProps) {
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
      <div className="max-w-sm">
        <AdminField label="Nombre" htmlFor="name" error={state.fieldErrors?.name}>
          <AdminInput
            id="name"
            name="name"
            type="text"
            defaultValue={initialValues?.name ?? ""}
          />
        </AdminField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
