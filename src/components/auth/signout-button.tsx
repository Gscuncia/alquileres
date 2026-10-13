"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/design-system";

export function SignOutButton() {
  return (
    <Button type="button" onClick={() => signOut({ callbackUrl: "/" })}>
      Cerrar sesión
    </Button>
  );
}
