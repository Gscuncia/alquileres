"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

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
        <AdminField label="Nombre" htmlFor="firstName" error={fieldErrors.firstName}>
          <AdminInput
            id="firstName"
            name="firstName"
            type="text"
            defaultValue={initialValues?.firstName ?? ""}
          />
        </AdminField>
        <AdminField label="Apellido" htmlFor="lastName" error={fieldErrors.lastName}>
          <AdminInput
            id="lastName"
            name="lastName"
            type="text"
            defaultValue={initialValues?.lastName ?? ""}
          />
        </AdminField>
        <AdminField label="DNI" htmlFor="dni" error={fieldErrors.dni}>
          <AdminInput
            id="dni"
            name="dni"
            type="text"
            inputMode="numeric"
            defaultValue={initialValues?.dni ?? ""}
          />
        </AdminField>
        <AdminField label="Teléfono" htmlFor="phone" error={fieldErrors.phone}>
          <AdminInput
            id="phone"
            name="phone"
            type="text"
            defaultValue={initialValues?.phone ?? ""}
          />
        </AdminField>
        <AdminField label="Email" htmlFor="email" error={fieldErrors.email}>
          <AdminInput
            id="email"
            name="email"
            type="text"
            defaultValue={initialValues?.email ?? ""}
          />
          <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
        </AdminField>
      </div>
      <AdminField label="Notas" htmlFor="notes" error={fieldErrors.notes}>
        <AdminInput
          as="textarea"
          id="notes"
          name="notes"
          rows={3}
          defaultValue={initialValues?.notes ?? ""}
        />
        <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
      </AdminField>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
