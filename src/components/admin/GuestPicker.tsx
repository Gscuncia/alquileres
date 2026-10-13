"use client";

import { useState } from "react";
import Link from "next/link";

export interface GuestOption {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone: string;
}

interface GuestPickerProps {
  guests: GuestOption[];
  defaultValue?: string;
  fieldError?: string;
}

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

/**
 * Guest selector: a native dropdown listing every loaded guest
 * ("Nombre Apellido — DNI"). Required so a booking always links to an
 * existing guest from the guest agenda, never a free-text name. Includes a
 * prominent call to action when no guests are loaded yet.
 */
export function GuestPicker({ guests, defaultValue, fieldError }: GuestPickerProps) {
  const [guestId, setGuestId] = useState(defaultValue ?? "");

  if (guests.length === 0) {
    return (
      <div className="space-y-2">
        <label htmlFor="guestId" className="block text-caption-sm font-medium text-ink mb-1">
          Huésped <span className="text-primary-error-text">*</span>
        </label>
        <div className="rounded-sm border border-hairline bg-surface-soft px-4 py-3">
          <p className="text-body-sm text-ink">
            Todavía no hay huéspedes cargados. Primero creá el huésped en la agenda de huéspedes y volvé a esta
            reserva para seleccionarlo.
          </p>
          <Link
            href="/admin/huespedes"
            className="mt-2 inline-flex items-center justify-center rounded-sm bg-primary px-4 py-2 text-button-sm font-medium text-on-primary transition-colors hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            Crear huésped primero
          </Link>
          {fieldError && (
            <p className="mt-2 text-caption-sm text-primary-error-text">{fieldError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="guestId" className="block text-caption-sm font-medium text-ink mb-1">
        Huésped <span className="text-primary-error-text">*</span>
      </label>
      <select
        id="guestId"
        name="guestId"
        required
        value={guestId}
        onChange={(event) => setGuestId(event.target.value)}
        className={inputClasses}
      >
        <option value="">Seleccionar huésped…</option>
        {guests.map((guest) => (
          <option key={guest.id} value={guest.id}>
            {guest.firstName} {guest.lastName} — DNI {guest.dni}
          </option>
        ))}
      </select>
      {fieldError && (
        <p className="text-caption-sm text-primary-error-text">{fieldError}</p>
      )}
      <p className="text-caption-sm text-muted">
        ¿El huésped no está cargado?{" "}
        <Link
          href="/admin/huespedes"
          className="text-ink underline-offset-2 hover:underline"
        >
          Crear huésped
        </Link>
      </p>
    </div>
  );
}
