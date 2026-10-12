"use client";

import React from "react";
import { SearchIcon } from "./icons";

export interface SearchField {
  label: string;
  placeholder?: string;
  value?: string;
  onClick?: () => void;
}

export interface SearchBarProps {
  fields?: SearchField[];
  onSearch?: () => void;
  submitLabel?: string;
}

const defaultFields: SearchField[] = [
  { label: "Dónde", placeholder: "Buscar destinos" },
  { label: "Cuándo", placeholder: "Agregá fechas" },
  { label: "Quiénes", placeholder: "Agregá huéspedes" },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  fields = defaultFields,
  onSearch,
  submitLabel = "Buscar",
}) => {
  return (
    <div className="w-full max-w-[850px]">
      {/* Desktop / tablet full bar */}
      <div className="hidden h-16 w-full items-center rounded-full border border-cream-line bg-canvas shadow-card md:flex">
        {fields.map((field, index) => (
          <React.Fragment key={field.label}>
            <button
              type="button"
              onClick={field.onClick}
              className="group flex flex-1 flex-col justify-center px-6 py-2 text-left transition-colors hover:bg-surface-soft first:rounded-l-full last:rounded-r-full"
            >
              <span className="text-caption font-semibold text-ink">
                {field.label}
              </span>
              <span className="truncate text-body-sm text-muted">
                {field.value || field.placeholder}
              </span>
            </button>
            {index < fields.length - 1 && (
              <div className="h-8 w-px bg-hairline" aria-hidden="true" />
            )}
          </React.Fragment>
        ))}
        <div className="pr-2 pl-1">
          <button
            type="button"
            aria-label={submitLabel}
            onClick={onSearch}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <SearchIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile collapsed pill */}
      <button
        type="button"
        className="flex h-12 w-full items-center gap-3 rounded-full border border-cream-line bg-canvas px-4 shadow-card md:hidden"
      >
        <SearchIcon className="h-5 w-5 text-ink" />
        <span className="text-body-sm text-muted">
          {fields[0]?.value || fields[0]?.placeholder || "Buscar"}
        </span>
      </button>
    </div>
  );
};
