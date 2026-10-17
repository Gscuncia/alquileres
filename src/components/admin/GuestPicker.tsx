"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/design-system";
import {
  AdminInput,
  AdminLabel,
  AdminError,
} from "@/components/admin/primitives";
import { normalizeForSearch } from "@/lib/search";

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

/** True when the guest matches the query on any searchable field. */
function guestMatches(guest: GuestOption, query: string): boolean {
  const needle = normalizeForSearch(query);
  if (needle === "") return true;
  return [
    guest.firstName,
    guest.lastName,
    `${guest.firstName} ${guest.lastName}`,
    guest.dni,
    guest.phone,
  ].some((field) => normalizeForSearch(field).includes(needle));
}

/**
 * Searchable guest selector for booking forms: a text search filters the
 * native dropdown by first name, last name, DNI or phone (accent- and
 * case-insensitive) so the picker stays usable as the guest agenda grows.
 * The select is the required form field ("guestId"); the search input is
 * unnamed so it never reaches the server action. Includes a prominent call
 * to action when no guests are loaded yet.
 */
export function GuestPicker({ guests, defaultValue, fieldError }: GuestPickerProps) {
  const [guestId, setGuestId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");

  const filtered = guests.filter((guest) => guestMatches(guest, query));
  const isFiltering = query.trim() !== "";

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
      <div className="space-y-2">
        <AdminLabel htmlFor="guestSearch">
          Buscar huésped
        </AdminLabel>
        <AdminInput
          type="search"
          id="guestSearch"
          placeholder="Nombre, apellido, DNI o teléfono…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
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
        {filtered.map((guest) => (
          <option key={guest.id} value={guest.id}>
            {guest.firstName} {guest.lastName} — DNI {guest.dni}
          </option>
        ))}
        {isFiltering && filtered.length === 0 && (
          <option value="" disabled>
            Sin huéspedes que coincidan con la búsqueda
          </option>
        )}
      </AdminInput>
      {isFiltering && filtered.length > 0 && (
        <p className="text-caption-sm text-muted">
          {filtered.length} de {guests.length} huéspedes coinciden con la búsqueda.
        </p>
      )}
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
