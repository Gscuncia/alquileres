"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

const TAB_OPTIONS = [
  { id: "panel", label: "Panel" },
  { id: "calendario", label: "Calendario" },
  { id: "propiedades", label: "Propiedades" },
  { id: "reservas", label: "Reservas" },
  { id: "huespedes", label: "Huéspedes" },
  { id: "destinatarios", label: "Destinatarios" },
  { id: "gastos", label: "Gastos" },
] as const;

interface RoleFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: {
    id: string;
    name: string;
    allowedTabs: string[];
  };
  submitLabel?: string;
}

export function RoleForm({
  action,
  initialValues,
  submitLabel = "Crear rol",
}: RoleFormProps) {
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
      <AdminField label="Nombre" htmlFor="name" error={state.fieldErrors?.name}>
        <AdminInput
          id="name"
          name="name"
          defaultValue={initialValues?.name ?? ""}
          required
        />
      </AdminField>
      <fieldset>
        <legend className="mb-2 text-caption-sm font-medium text-ink">
          Pestañas permitidas
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {TAB_OPTIONS.map((tab) => {
            const checked = initialValues?.allowedTabs.includes(tab.id) ?? false;
            return (
              <label
                key={tab.id}
                className="flex items-center gap-2 text-body-sm text-body"
              >
                <input
                  type="checkbox"
                  name={`tab-${tab.id}`}
                  value="on"
                  defaultChecked={checked}
                  className="h-4 w-4 accent-primary"
                />
                {tab.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
