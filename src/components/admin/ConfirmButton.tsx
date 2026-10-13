"use client";

import { useState } from "react";
import { Button } from "@/components/design-system";

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
      <Button
        type="button"
        variant="secondary"
        onClick={() => setConfirming(true)}
        className={className}
      >
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-button-sm text-ink">{confirmQuestion}</span>
      <Button type="submit" variant="primary">
        {confirmLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setConfirming(false)}
        className="text-muted"
      >
        {cancelLabel}
      </Button>
    </span>
  );
}
