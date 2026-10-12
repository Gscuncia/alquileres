"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";

interface ExpenseFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  properties: { id: string; title: string }[];
  initialValues?: {
    id: string;
    type: "MANTENIMIENTO" | "CONSORCIO";
    propertyId?: string | null;
    category: string;
    description?: string | null;
    amount: number | string;
    /** `YYYY-MM-DD` in Buenos Aires local time. */
    date: string;
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

export function ExpenseForm({
  action,
  properties,
  initialValues,
  submitLabel = "Guardar",
}: ExpenseFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [type, setType] = useState<"MANTENIMIENTO" | "CONSORCIO">(
    initialValues?.type ?? "MANTENIMIENTO",
  );

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
        <div>
          <label htmlFor="type" className={labelClasses}>
            Tipo
          </label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            className={inputClasses}
          >
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="CONSORCIO">Consorcio (general)</option>
          </select>
          <FieldError message={state.fieldErrors?.type} />
        </div>
        {type === "MANTENIMIENTO" && (
          <div>
            <label htmlFor="propertyId" className={labelClasses}>
              Propiedad
            </label>
            <select
              id="propertyId"
              name="propertyId"
              defaultValue={initialValues?.propertyId ?? ""}
              className={inputClasses}
            >
              <option value="">Seleccionar…</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.title}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors?.propertyId} />
          </div>
        )}
        <div>
          <label htmlFor="category" className={labelClasses}>
            Categoría
          </label>
          <input
            id="category"
            name="category"
            type="text"
            placeholder="Plomería"
            defaultValue={initialValues?.category ?? ""}
            className={inputClasses}
          />
          <FieldError message={state.fieldErrors?.category} />
        </div>
        <div>
          <label htmlFor="amount" className={labelClasses}>
            Importe
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="15000"
            defaultValue={initialValues?.amount ?? ""}
            className={inputClasses}
          />
          <FieldError message={state.fieldErrors?.amount} />
        </div>
        <div>
          <label htmlFor="date" className={labelClasses}>
            Fecha
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={initialValues?.date ?? ""}
            className={inputClasses}
          />
          <FieldError message={state.fieldErrors?.date} />
        </div>
      </div>
      <div>
        <label htmlFor="description" className={labelClasses}>
          Descripción (opcional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          defaultValue={initialValues?.description ?? ""}
          className={inputClasses}
        />
        <FieldError message={state.fieldErrors?.description} />
      </div>
      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
