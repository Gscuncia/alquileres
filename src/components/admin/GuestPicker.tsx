"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/design-system";
import {
  AdminInput,
  AdminLabel,
  AdminError,
} from "@/components/admin/primitives";

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
        <AdminLabel htmlFor="guestId">
          Huésped <span className="text-primary-error-text">*</span>
        </AdminLabel>
        <div className="rounded-sm border border-hairline bg-surface-soft px-4 py-3">
          <p className="text-body-sm text-ink">
            Todavía no hay huéspedes cargados. Primero creá el huésped en la agenda de huéspedes y volvé a esta
            reserva para seleccionarlo.
          </p>
          <Button asChild variant="primary" className="mt-2">
            <Link href="/admin/huespedes">
              Crear huésped primero
            </Link>
          </Button>
          <AdminError message={fieldError} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AdminLabel htmlFor="guestId">
        Huésped <span className="text-primary-error-text">*</span>
      </AdminLabel>
      <AdminInput
        as="select"
        id="guestId"
        name="guestId"
        required
        value={guestId}
        onChange={(event) => setGuestId(event.target.value)}
      >
        <option value="">Seleccionar huésped…</option>
        {guests.map((guest) => (
          <option key={guest.id} value={guest.id}>
            {guest.firstName} {guest.lastName} — DNI {guest.dni}
          </option>
        ))}
      </AdminInput>
      <AdminError message={fieldError} />
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
