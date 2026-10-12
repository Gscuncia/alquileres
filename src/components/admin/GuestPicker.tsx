"use client";

import { useState } from "react";
import Link from "next/link";
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

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

/**
 * Searchable guest selector: free-text filter (accent-insensitive via
 * `normalizeForSearch`) over the serialized guest list, selectable rows
 * "Nombre Apellido — DNI", and a hidden `guestId` input carrying the
 * selection to the server action. Includes a quick-link to create a
 * guest first when none of the existing ones fits.
 */
export function GuestPicker({ guests, defaultValue, fieldError }: GuestPickerProps) {
  const [selectedId, setSelectedId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");

  const normalizedQuery = normalizeForSearch(query);
  const selected = guests.find((guest) => guest.id === selectedId) ?? null;

  const filtered = normalizedQuery
    ? guests.filter((guest) =>
        [guest.firstName, guest.lastName, guest.dni, guest.phone].some(
          (field) => normalizeForSearch(field).includes(normalizedQuery),
        ),
      )
    : guests;

  return (
    <div className="space-y-2">
      <label htmlFor="guest-search" className="block text-caption-sm font-medium text-ink mb-1">
        Huésped
      </label>
      <input type="hidden" name="guestId" value={selectedId} />
      <input
        id="guest-search"
        type="text"
        placeholder="Buscar huésped…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={inputClasses}
      />
      {selected ? (
        <p className="text-caption-sm text-ink">
          Seleccionado:{" "}
          <span className="font-medium">
            {selected.firstName} {selected.lastName} — {selected.dni}
          </span>
        </p>
      ) : (
        <p className="text-caption-sm text-muted">Ningún huésped seleccionado.</p>
      )}
      {fieldError && (
        <p className="text-caption-sm text-primary-error-text">{fieldError}</p>
      )}
      <ul className="max-h-48 divide-y divide-hairline overflow-y-auto rounded-sm border border-hairline">
        {filtered.length === 0 ? (
          <li className="px-3 py-2 text-caption-sm text-muted">
            No hay huéspedes que coincidan.
          </li>
        ) : (
          filtered.map((guest) => (
            <li key={guest.id}>
              <button
                type="button"
                onClick={() => setSelectedId(guest.id)}
                aria-pressed={guest.id === selectedId}
                className={`flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-body-sm hover:bg-surface-soft ${
                  guest.id === selectedId ? "font-medium text-ink" : "text-body"
                }`}
              >
                <span>
                  {guest.firstName} {guest.lastName} — {guest.dni}
                </span>
                {guest.id === selectedId && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))
        )}
      </ul>
      <p className="text-caption-sm text-muted">
        ¿No está?{" "}
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
