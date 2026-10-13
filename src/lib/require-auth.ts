import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

/**
 * Check whether the session belongs to the default administrator.
 * Default admins bypass tab-level restrictions.
 */
export function isAdmin(session: Session | null): boolean {
  return session?.user?.isDefaultAdmin === true;
}

/**
 * Check whether the session is allowed to access a given admin tab.
 * Default admins are always allowed.
 */
export function hasTab(session: Session | null, tab: string): boolean {
  if (isAdmin(session)) {
    return true;
  }
  return session?.user?.allowedTabs?.includes(tab) ?? false;
}

/**
 * Gate for admin pages/layouts: unauthenticated users go to sign-in;
 * authenticated users without any allowed admin tabs get the access-denied
 * page. When a tab is provided, the user must have that tab in their role.
 * Default admins bypass all tab checks.
 */
export async function requirePermission(tab?: string) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  if (isAdmin(session)) {
    return session;
  }

  const allowedTabs = session.user.allowedTabs ?? [];

  if (allowedTabs.length === 0 || (tab && !allowedTabs.includes(tab))) {
    redirect("/auth/access-denied");
  }

  return session;
}

/**
 * Gate for server actions: throws a generic error so internals are not leaked.
 * Only default administrators may perform role-management actions.
 */
export async function requireAdminForAction() {
  const session = await auth();

  if (!isAdmin(session)) {
    throw new Error("No autorizado");
  }

  return session;
}

/**
 * @deprecated Use `requirePermission()` from `@/lib/require-auth` instead.
 * Kept as a compatibility export for existing admin pages until Phase 4
 * applies tab-level guards.
 */
export async function requireAdmin() {
  return requirePermission();
}
