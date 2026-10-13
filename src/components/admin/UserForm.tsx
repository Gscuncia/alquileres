"use client";

import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

interface RoleOption {
  id: string;
  name: string;
}

interface UserFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  roles: RoleOption[];
  submitLabel?: string;
}

export function UserForm({
  action,
  roles,
  submitLabel = "Crear usuario",
}: UserFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {state.ok && (
        <div
          role="status"
          className="rounded-sm border border-hairline bg-sky px-4 py-3 text-body-sm text-ink md:col-span-2"
        >
          Los cambios se guardaron correctamente.
        </div>
      )}
      {!state.ok && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text md:col-span-2"
        >
          {state.message}
        </div>
      )}
      <AdminField label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <AdminInput id="email" name="email" type="email" required />
      </AdminField>
      <AdminField label="Rol" htmlFor="roleId" error={state.fieldErrors?.roleId}>
        <AdminInput as="select" id="roleId" name="roleId" required>
          <option value="">Seleccionar rol</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </AdminInput>
      </AdminField>
      <AdminField label="Nombre" htmlFor="firstName" error={state.fieldErrors?.firstName}>
        <AdminInput id="firstName" name="firstName" required />
      </AdminField>
      <AdminField label="Apellido" htmlFor="lastName" error={state.fieldErrors?.lastName}>
        <AdminInput id="lastName" name="lastName" required />
      </AdminField>
      <div className="flex flex-col items-start gap-2 md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
        <p className="text-caption-sm text-muted">
          La contraseña inicial será <strong>anita1234</strong>; el usuario deberá cambiarla en el primer ingreso.
        </p>
      </div>
    </form>
  );
}
