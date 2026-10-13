"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import { GuestPicker, type GuestOption } from "@/components/admin/GuestPicker";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

export interface RecipientOption {
  id: string;
  name: string;
}

export interface BookingFormValues {
  id?: string;
  propertyId: string;
  guestId: string;
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  pricePerNight: string;
  depositAmount: string;
  paymentType: "EFECTIVO" | "TRANSFERENCIA";
  paymentMethod: string;
  notes: string;
  recipientId: string;
}

interface BookingFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: Partial<BookingFormValues>;
  guests: GuestOption[];
  recipients: RecipientOption[];
  /** Provided only where a property may be chosen in the form (calendar). */
  properties?: { id: string; title: string }[];
  submitLabel?: string;
}

export const EMPTY_BOOKING_FORM: BookingFormValues = {
  propertyId: "",
  guestId: "",
  checkInDate: "",
  checkInTime: "12:00",
  checkOutDate: "",
  checkOutTime: "10:00",
  pricePerNight: "",
  depositAmount: "0",
  paymentType: "EFECTIVO",
  paymentMethod: "",
  notes: "",
  recipientId: "",
};

const SLOT_MINUTES = ["00", "30"] as const;

/** Every 30-minute slot of the day: 00:00 … 23:30. */
const TIME_SLOTS: string[] = Array.from({ length: 24 }, (_, hour) =>
  Array.from(SLOT_MINUTES, (minutes) => `${String(hour).padStart(2, "0")}:${minutes}`),
).flat();

export function BookingForm({
  action,
  initialValues,
  guests,
  recipients,
  properties,
  submitLabel = "Guardar",
}: BookingFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const values = { ...EMPTY_BOOKING_FORM, ...initialValues };
  const [paymentType, setPaymentType] = useState<"EFECTIVO" | "TRANSFERENCIA">(
    values.paymentType,
  );
  const fieldErrors = state.fieldErrors ?? {};
  const isTransferencia = paymentType === "TRANSFERENCIA";

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
      {values.id && <input type="hidden" name="id" value={values.id} />}

      {!properties && values.propertyId && (
        <input type="hidden" name="propertyId" value={values.propertyId} />
      )}
      {properties && (
        <AdminField label="Propiedad" htmlFor="propertyId" error={fieldErrors.propertyId}>
          <AdminInput
            as="select"
            id="propertyId"
            name="propertyId"
            required
            defaultValue={values.propertyId}
          >
            <option value="">Seleccionar propiedad…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </AdminInput>
        </AdminField>
      )}

      <div>
        <GuestPicker
          guests={guests}
          defaultValue={values.guestId}
          fieldError={fieldErrors.guestId}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminField label="Fecha de ingreso" htmlFor="checkInDate" error={fieldErrors.checkInDate}>
          <AdminInput
            id="checkInDate"
            name="checkInDate"
            type="date"
            required
            defaultValue={values.checkInDate}
          />
        </AdminField>
        <AdminField label="Hora de ingreso" htmlFor="checkInTime" error={fieldErrors.checkInTime}>
          <AdminInput
            as="select"
            id="checkInTime"
            name="checkInTime"
            required
            defaultValue={values.checkInTime}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </AdminInput>
        </AdminField>
        <AdminField label="Fecha de egreso" htmlFor="checkOutDate" error={fieldErrors.checkOutDate}>
          <AdminInput
            id="checkOutDate"
            name="checkOutDate"
            type="date"
            required
            defaultValue={values.checkOutDate}
          />
        </AdminField>
        <AdminField label="Hora de egreso" htmlFor="checkOutTime" error={fieldErrors.checkOut}>
          <AdminInput
            as="select"
            id="checkOutTime"
            name="checkOutTime"
            required
            defaultValue={values.checkOutTime}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </AdminInput>
        </AdminField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminField label="Precio por noche" htmlFor="pricePerNight" error={fieldErrors.pricePerNight}>
          <AdminInput
            id="pricePerNight"
            name="pricePerNight"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.pricePerNight}
          />
        </AdminField>
        <AdminField label="Seña" htmlFor="depositAmount" error={fieldErrors.depositAmount}>
          <AdminInput
            id="depositAmount"
            name="depositAmount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.depositAmount}
          />
        </AdminField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminField label="Tipo de pago" htmlFor="paymentType" error={fieldErrors.paymentType}>
          <AdminInput
            as="select"
            id="paymentType"
            name="paymentType"
            value={paymentType}
            onChange={(event) =>
              setPaymentType(event.target.value as "EFECTIVO" | "TRANSFERENCIA")
            }
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </AdminInput>
        </AdminField>
        <AdminField label="Método de pago" htmlFor="paymentMethod" error={fieldErrors.paymentMethod}>
          <AdminInput
            id="paymentMethod"
            name="paymentMethod"
            type="text"
            defaultValue={values.paymentMethod}
          />
          <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
        </AdminField>
      </div>

      {isTransferencia && (
        <AdminField label="Destinatario" htmlFor="recipientId" error={fieldErrors.recipientId}>
          <AdminInput
            as="select"
            id="recipientId"
            name="recipientId"
            required
            defaultValue={values.recipientId}
          >
            <option value="">Seleccionar destinatario…</option>
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
              </option>
            ))}
          </AdminInput>
        </AdminField>
      )}

      <AdminField label="Notas" htmlFor="notes" error={fieldErrors.notes}>
        <AdminInput
          as="textarea"
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values.notes}
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
