"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

export interface ExpenseTypeOption {
  id: string;
  name: string;
  requiresProperty: boolean;
}

interface ExpenseFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  properties: { id: string; title: string }[];
  expenseTypes: ExpenseTypeOption[];
  initialValues?: {
    id: string;
    typeId: string;
    /** Empty for general expenses (never persisted with a property). */
    propertyId?: string | null;
    category: string;
    description?: string | null;
    amount: number | string;
    /** `YYYY-MM-DD` in Buenos Aires local time. */
    date: string;
  };
  submitLabel?: string;
}

export function ExpenseForm({
  action,
  properties,
  expenseTypes,
  initialValues,
  submitLabel = "Guardar",
}: ExpenseFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [typeId, setTypeId] = useState(initialValues?.typeId ?? "");
  const selectedType = expenseTypes.find((type) => type.id === typeId);

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
        <AdminField label="Tipo" htmlFor="typeId" error={state.fieldErrors?.typeId}>
          <AdminInput
            as="select"
            id="typeId"
            name="typeId"
            value={typeId}
            onChange={(event) => setTypeId(event.target.value)}
          >
            <option value="">Seleccionar tipo…</option>
            {expenseTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </AdminInput>
        </AdminField>
        {selectedType?.requiresProperty ? (
          <AdminField label="Propiedad" htmlFor="propertyId" error={state.fieldErrors?.propertyId}>
            <AdminInput
              as="select"
              id="propertyId"
              name="propertyId"
              defaultValue={initialValues?.propertyId ?? ""}
            >
              <option value="">Seleccionar…</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </AdminInput>
          </AdminField>
        ) : (
          // General types submit an empty propertyId; the action clears it.
          <input type="hidden" name="propertyId" value="" />
        )}
        <AdminField label="Categoría" htmlFor="category" error={state.fieldErrors?.category}>
          <AdminInput
            id="category"
            name="category"
            type="text"
            placeholder="Plomería"
            defaultValue={initialValues?.category ?? ""}
          />
        </AdminField>
        <AdminField label="Importe" htmlFor="amount" error={state.fieldErrors?.amount}>
          <AdminInput
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="15000"
            defaultValue={initialValues?.amount ?? ""}
          />
        </AdminField>
        <AdminField label="Fecha" htmlFor="date" error={state.fieldErrors?.date}>
          <AdminInput
            id="date"
            name="date"
            type="date"
            defaultValue={initialValues?.date ?? ""}
          />
        </AdminField>
      </div>
      <AdminField label="Descripción (opcional)" htmlFor="description" error={state.fieldErrors?.description}>
        <AdminInput
          as="textarea"
          id="description"
          name="description"
          rows={2}
          defaultValue={initialValues?.description ?? ""}
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
