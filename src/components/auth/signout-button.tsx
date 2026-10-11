"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-sm bg-primary px-4 py-2 text-button-sm font-medium text-on-primary transition-colors hover:bg-primary-active"
    >
      Cerrar sesión
    </button>
  );
}
