"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import { GuestPicker, type GuestOption } from "@/components/admin/GuestPicker";

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

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption-sm text-primary-error-text">{message}</p>;
}

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
        <div>
          <label htmlFor="propertyId" className={labelClasses}>
            Propiedad
          </label>
          <select
            id="propertyId"
            name="propertyId"
            required
            defaultValue={values.propertyId}
            className={inputClasses}
          >
            <option value="">Seleccionar propiedad…</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.propertyId} />
        </div>
      )}

      <div>
        <GuestPicker
          guests={guests}
          defaultValue={values.guestId}
          fieldError={fieldErrors.guestId}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label htmlFor="checkInDate" className={labelClasses}>
            Fecha de ingreso
          </label>
          <input
            id="checkInDate"
            name="checkInDate"
            type="date"
            required
            defaultValue={values.checkInDate}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.checkInDate} />
        </div>
        <div>
          <label htmlFor="checkInTime" className={labelClasses}>
            Hora de ingreso
          </label>
          <select
            id="checkInTime"
            name="checkInTime"
            required
            defaultValue={values.checkInTime}
            className={inputClasses}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.checkInTime} />
        </div>
        <div>
          <label htmlFor="checkOutDate" className={labelClasses}>
            Fecha de egreso
          </label>
          <input
            id="checkOutDate"
            name="checkOutDate"
            type="date"
            required
            defaultValue={values.checkOutDate}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.checkOutDate} />
        </div>
        <div>
          <label htmlFor="checkOutTime" className={labelClasses}>
            Hora de egreso
          </label>
          <select
            id="checkOutTime"
            name="checkOutTime"
            required
            defaultValue={values.checkOutTime}
            className={inputClasses}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.checkOut} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="pricePerNight" className={labelClasses}>
            Precio por noche
          </label>
          <input
            id="pricePerNight"
            name="pricePerNight"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.pricePerNight}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.pricePerNight} />
        </div>
        <div>
          <label htmlFor="depositAmount" className={labelClasses}>
            Seña
          </label>
          <input
            id="depositAmount"
            name="depositAmount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={values.depositAmount}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.depositAmount} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="paymentType" className={labelClasses}>
            Tipo de pago
          </label>
          <select
            id="paymentType"
            name="paymentType"
            value={paymentType}
            onChange={(event) =>
              setPaymentType(event.target.value as "EFECTIVO" | "TRANSFERENCIA")
            }
            className={inputClasses}
          >
            <option value="EFECTIVO">Efectivo</option>
            <option value="TRANSFERENCIA">Transferencia</option>
          </select>
          <FieldError message={fieldErrors.paymentType} />
        </div>
        <div>
          <label htmlFor="paymentMethod" className={labelClasses}>
            Método de pago
          </label>
          <input
            id="paymentMethod"
            name="paymentMethod"
            type="text"
            defaultValue={values.paymentMethod}
            className={inputClasses}
          />
          <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
          <FieldError message={fieldErrors.paymentMethod} />
        </div>
      </div>

      {isTransferencia && (
        <div>
          <label htmlFor="recipientId" className={labelClasses}>
            Destinatario
          </label>
          <select
            id="recipientId"
            name="recipientId"
            required
            defaultValue={values.recipientId}
            className={inputClasses}
          >
            <option value="">Seleccionar destinatario…</option>
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.recipientId} />
        </div>
      )}

      <div>
        <label htmlFor="notes" className={labelClasses}>
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={values.notes}
          className={inputClasses}
        />
        <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
        <FieldError message={fieldErrors.notes} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
