"use client";

import { useState } from "react";

interface ConfirmButtonProps {
  label?: string;
  /** Verbose Spanish label shown during the second confirm step. */
  confirmQuestion?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  className?: string;
}

/**
 * Two-step inline delete confirmation rendered inside a <form>:
 * first click swaps the button for "¿Eliminar? Sí / No" — the "Sí" button is
 * the actual submit, so no modal library is needed.
 */
export function ConfirmButton({
  label = "Eliminar",
  confirmQuestion = "¿Eliminar?",
  confirmLabel = "Sí",
  cancelLabel = "No",
  className = "",
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`rounded-sm border border-ink bg-canvas px-4 py-2 text-button-sm font-medium text-ink transition-colors hover:bg-surface-soft ${className}`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-button-sm text-ink">{confirmQuestion}</span>
      <button
        type="submit"
        className="rounded-sm bg-primary px-4 py-2 text-button-sm font-medium text-on-primary transition-colors hover:bg-primary-active"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="rounded-sm px-2 py-2 text-button-sm text-muted transition-colors hover:bg-surface-soft"
      >
        {cancelLabel}
      </button>
    </span>
  );
}
