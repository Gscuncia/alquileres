"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";
import { GuestPicker, type GuestOption } from "@/components/admin/GuestPicker";
import {
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { stayNights, toUtc, formatInTz } from "@/lib/datetime";
import { formatMoney } from "@/lib/metrics";

export interface RecipientOption {
  id: string;
  name: string;
}

/** Existing stay used for the client-side availability alert. */
export interface BookingOverlapOption {
  id: string;
  propertyId: string;
  guestName: string;
  /** ISO instants of the existing stay. */
  checkIn: string;
  checkOut: string;
}

export type PaymentTypeValue = "EFECTIVO" | "TRANSFERENCIA";

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
  depositPaymentType: PaymentTypeValue;
  depositPaymentMethod: string;
  depositRecipientId: string;
  restPaymentType: PaymentTypeValue;
  restRecipientId: string;
  notes: string;
}

interface BookingFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: Partial<BookingFormValues>;
  guests: GuestOption[];
  recipients: RecipientOption[];
  /** Provided only where a property may be chosen in the form (calendar). */
  properties?: { id: string; title: string }[];
  /** Existing stays for the live availability alert. */
  bookings?: BookingOverlapOption[];
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
  depositPaymentType: "EFECTIVO",
  depositPaymentMethod: "",
  depositRecipientId: "",
  restPaymentType: "EFECTIVO",
  restRecipientId: "",
  notes: "",
};

const SLOT_MINUTES = ["00", "30"] as const;

/** Every 30-minute slot of the day: 00:00 … 23:30. */
const TIME_SLOTS: string[] = Array.from({ length: 24 }, (_, hour) =>
  Array.from(SLOT_MINUTES, (minutes) => `${String(hour).padStart(2, "0")}:${minutes}`),
).flat();

/** Money input parser: empty or garbage parses to 0 for live math. */
function parseMoney(raw: string): number {
  const parsed = Number(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function recipientSelect(
  id: string,
  recipients: RecipientOption[],
  defaultValue: string,
) {
  return (
    <AdminInput as="select" id={id} name={id} required defaultValue={defaultValue}>
      <option value="">Seleccionar destinatario…</option>
      {recipients.map((recipient) => (
        <option key={recipient.id} value={recipient.id}>
          {recipient.name}
        </option>
      ))}
    </AdminInput>
  );
}

export function BookingForm({
  action,
  initialValues,
  guests,
  recipients,
  properties,
  bookings,
  submitLabel = "Guardar",
}: BookingFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const values = { ...EMPTY_BOOKING_FORM, ...initialValues };
  const [depositPaymentType, setDepositPaymentType] = useState<PaymentTypeValue>(
    values.depositPaymentType,
  );
  const [restPaymentType, setRestPaymentType] = useState<PaymentTypeValue>(
    values.restPaymentType,
  );
  const [pricePerNight, setPricePerNight] = useState(values.pricePerNight);
  const [depositAmount, setDepositAmount] = useState(values.depositAmount);
  const [checkInDate, setCheckInDate] = useState(values.checkInDate);
  const [checkInTime, setCheckInTime] = useState(values.checkInTime);
  const [checkOutDate, setCheckOutDate] = useState(values.checkOutDate);
  const [checkOutTime, setCheckOutTime] = useState(values.checkOutTime);
  const [propertyId, setPropertyId] = useState(values.propertyId);
  const fieldErrors = state.fieldErrors ?? {};

  // Live summary: total and rest derived from the current inputs. Incomplete
  // dates show a dash instead of a number.
  const price = parseMoney(pricePerNight);
  const deposit = parseMoney(depositAmount);
  const hasStay =
    checkInDate !== "" &&
    checkOutDate !== "" &&
    toUtc(checkInDate, checkInTime).getTime() <
      toUtc(checkOutDate, checkOutTime).getTime();
  const nights = hasStay
    ? stayNights(
        toUtc(checkInDate, checkInTime),
        toUtc(checkOutDate, checkOutTime),
      )
    : null;
  const total = price > 0 && nights !== null ? price * nights : null;
  const rest = total === null ? null : Math.max(0, total - deposit);

  // Live availability: overlapping stays of the selected property block the
  // submit client-side; the server action re-checks authoritatively on save.
  // A booking being edited never conflicts with itself.
  const activePropertyId = properties ? propertyId : values.propertyId;
  const formCheckIn = hasStay ? toUtc(checkInDate, checkInTime) : null;
  const formCheckOut = hasStay ? toUtc(checkOutDate, checkOutTime) : null;
  const conflicts = (bookings ?? []).filter(
    (booking) =>
      formCheckIn !== null &&
      formCheckOut !== null &&
      booking.propertyId === activePropertyId &&
      booking.id !== values.id &&
      new Date(booking.checkIn) < formCheckOut &&
      new Date(booking.checkOut) > formCheckIn,
  );
  const hasConflicts = conflicts.length > 0;
  const propertyTitle =
    properties?.find((property) => property.id === activePropertyId)?.title ??
    "El alojamiento";

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
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
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
            value={checkInDate}
            onChange={(event) => setCheckInDate(event.target.value)}
          />
        </AdminField>        <AdminField label="Hora de ingreso" htmlFor="checkInTime" error={fieldErrors.checkInTime}>
          <AdminInput
            as="select"
            id="checkInTime"
            name="checkInTime"
            required
            value={checkInTime}
            onChange={(event) => setCheckInTime(event.target.value)}
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
            value={checkOutDate}
            onChange={(event) => setCheckOutDate(event.target.value)}
          />
        </AdminField>
        <AdminField label="Hora de egreso" htmlFor="checkOutTime" error={fieldErrors.checkOutTime}>
          <AdminInput
            as="select"
            id="checkOutTime"
            name="checkOutTime"
            required
            value={checkOutTime}
            onChange={(event) => setCheckOutTime(event.target.value)}
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </AdminInput>
        </AdminField>
      </div>

      {hasConflicts && (
        <div
          role="alert"
          className="space-y-1 rounded-sm border border-primary-error-text bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          {conflicts.map((conflict) => (
            <p key={conflict.id}>
              ⚠️ {propertyTitle} ya está reservado por {conflict.guestName} entre el{" "}
              {formatInTz(new Date(conflict.checkIn))} y el{" "}
              {formatInTz(new Date(conflict.checkOut))}. Elegí otras fechas u otro
              alojamiento.
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminField label="Precio por noche" htmlFor="pricePerNight" error={fieldErrors.pricePerNight}>
          <AdminInput
            id="pricePerNight"
            name="pricePerNight"
            type="number"
            step="0.01"
            min={0}
            value={pricePerNight}
            onChange={(event) => setPricePerNight(event.target.value)}
          />
        </AdminField>
        <AdminField label="Seña" htmlFor="depositAmount" error={fieldErrors.depositAmount}>
          <AdminInput
            id="depositAmount"
            name="depositAmount"
            type="number"
            step="0.01"
            min={0}
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
          />
        </AdminField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <fieldset className="rounded-sm border border-hairline p-4">
          <legend className="px-1 text-caption-sm font-semibold text-ink">
            Pago de la seña
          </legend>
          <div className="space-y-4">
            <AdminField
              label="Tipo de pago"
              htmlFor="depositPaymentType"
              error={fieldErrors.depositPaymentType}
            >
              <AdminInput
                as="select"
                id="depositPaymentType"
                name="depositPaymentType"
                value={depositPaymentType}
                onChange={(event) =>
                  setDepositPaymentType(
                    event.target.value as PaymentTypeValue,
                  )
                }
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </AdminInput>
            </AdminField>
            <AdminField
              label="Detalle"
              htmlFor="depositPaymentMethod"
              error={fieldErrors.depositPaymentMethod}
            >
              <AdminInput
                id="depositPaymentMethod"
                name="depositPaymentMethod"
                type="text"
                defaultValue={values.depositPaymentMethod}
              />
              <p className="mt-1 text-caption-sm text-muted">Opcional.</p>
            </AdminField>
            {depositPaymentType === "TRANSFERENCIA" && (
              <AdminField
                label="Destinatario"
                htmlFor="depositRecipientId"
                error={fieldErrors.depositRecipientId}
              >
                {recipientSelect(
                  "depositRecipientId",
                  recipients,
                  values.depositRecipientId,
                )}
              </AdminField>
            )}
          </div>
        </fieldset>

        <fieldset className="rounded-sm border border-hairline p-4">
          <legend className="px-1 text-caption-sm font-semibold text-ink">
            Pago restante
          </legend>
          <div className="space-y-4">
            <AdminField
              label="Tipo de pago"
              htmlFor="restPaymentType"
              error={fieldErrors.restPaymentType}
            >
              <AdminInput
                as="select"
                id="restPaymentType"
                name="restPaymentType"
                value={restPaymentType}
                onChange={(event) =>
                  setRestPaymentType(event.target.value as PaymentTypeValue)
                }
              >
                <option value="EFECTIVO">Efectivo</option>
                <option value="TRANSFERENCIA">Transferencia</option>
              </AdminInput>
            </AdminField>
            {restPaymentType === "TRANSFERENCIA" && (
              <AdminField
                label="Destinatario"
                htmlFor="restRecipientId"
                error={fieldErrors.restRecipientId}
              >
                {recipientSelect(
                  "restRecipientId",
                  recipients,
                  values.restRecipientId,
                )}
              </AdminField>
            )}
          </div>
        </fieldset>
      </div>

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

      <div className="rounded-sm border border-hairline bg-surface-soft px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-muted">Cantidad de noches</span>
          <span className="text-body-sm font-semibold text-ink">
            {nights === null ? "—" : `${nights} ${nights === 1 ? "noche" : "noches"}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-muted">Monto total de la reserva</span>
          <span className="text-body-sm font-semibold text-ink">
            {total === null ? "—" : formatMoney(total)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-muted">Monto seña</span>
          <span className="text-body-sm font-semibold text-ink">
            {formatMoney(deposit)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-sm text-muted">Monto para completar pago</span>
          <span className="text-body-sm font-semibold text-ink">
            {rest === null ? "—" : formatMoney(rest)}
          </span>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={hasConflicts}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
