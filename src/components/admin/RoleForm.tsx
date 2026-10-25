"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { GRANTABLE_ADMIN_TABS } from "@/lib/admin-tabs";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

interface RoleFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: {
    id: string;
    name: string;
    allowedTabs: string[];
    landingTab?: string | null;
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
          {GRANTABLE_ADMIN_TABS.map((tab) => {
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
      <AdminField
        label="Pestaña inicial (al ingresar)"
        htmlFor="landingTab"
        error={state.fieldErrors?.landingTab}
      >
        <AdminInput
          as="select"
          id="landingTab"
          name="landingTab"
          defaultValue={initialValues?.landingTab ?? ""}
        >
          <option value="">Por defecto (Panel)</option>
          {GRANTABLE_ADMIN_TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </AdminInput>
      </AdminField>
      <p className="text-caption-sm text-muted">
        Solo puede elegirse una pestaña que esté permitida para el rol. Sin
        selección, el usuario aterriza en el Panel.
      </p>
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}
