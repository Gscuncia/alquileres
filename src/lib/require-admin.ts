import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Gate for admin pages/layouts: unauthenticated users go to sign-in;
 * authenticated non-admins get the access-denied state.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/auth/access-denied");
  }

  return session;
}

/**
 * Gate for server actions: throws a generic error so internals are not leaked.
 */
export async function requireAdminForAction() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("No autorizado");
  }

  return session;
}
