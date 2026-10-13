"use client";

import { useFormState } from "react-dom";
import { deleteUser } from "@/app/admin/usuarios/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const [state, formAction] = useFormState(deleteUser, { ok: false });

  return (
    <form action={formAction}>
      <input type="hidden" name="userId" value={userId} />
      <ConfirmButton
        label="Eliminar"
        confirmQuestion="¿Eliminar usuario?"
        confirmLabel="Sí"
        cancelLabel="No"
      />
      {state.ok === false && state.message && (
        <p className="mt-1 text-caption-sm text-primary-error-text">
          {state.message}
        </p>
      )}
    </form>
  );
}
