"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import { AdminField, AdminInput } from "@/components/admin/primitives";

export interface LocationContentFormValues {
  address: string;
  body: string;
}

/**
 * Editor for the «¿Dónde estamos?» page: highlighted address line and body
 * paragraphs (blank-line separated) shown under the map.
 */
export function LocationContentForm({
  action,
  initialValues,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues: LocationContentFormValues;
}) {
  const [state, formAction] = useFormState(action, { ok: false });
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
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

      <AdminField
        label="Dirección destacada"
        htmlFor="address"
        error={fieldErrors.address}
      >
        <AdminInput
          id="address"
          name="address"
          type="text"
          defaultValue={initialValues.address}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Aparece en «¿Dónde estamos?» y en la portada.
        </p>
      </AdminField>

      <AdminField label="Texto de la página (párrafos separados por una línea en blanco)" htmlFor="body" error={fieldErrors.body}>
        <AdminInput
          as="textarea"
          id="body"
          name="body"
          rows={10}
          defaultValue={initialValues.body}
        />
      </AdminField>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
