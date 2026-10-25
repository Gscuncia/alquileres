import { ADMIN_TABS } from "@/lib/admin-tabs";

/** Fallback path when a user has no granted admin tabs at all. */
export const ADMIN_ACCESS_DENIED_PATH = "/auth/access-denied";

/** Default landing path for users with the "panel" tab (default admins). */
export const ADMIN_DEFAULT_PATH = "/admin";

function tabHref(tabId: string): string | null {
  return ADMIN_TABS.find((tab) => tab.id === tabId)?.href ?? null;
}

/**
 * Path a role-based user should land on when the requested tab is not
 * granted: the role's configured landing tab when it is still granted,
 * otherwise the first granted tab in canonical registry order, otherwise
 * the access-denied page (which also avoids a redirect loop on /admin).
 */
export function resolveAdminLandingPath(
  allowedTabs: string[],
  landingTab?: string | null,
): string {
  if (landingTab && allowedTabs.includes(landingTab)) {
    const href = tabHref(landingTab);
    if (href) {
      return href;
    }
  }
  for (const tab of ADMIN_TABS) {
    if (allowedTabs.includes(tab.id)) {
      const href = tabHref(tab.id);
      if (href) {
        return href;
      }
    }
  }
  return ADMIN_ACCESS_DENIED_PATH;
}

/**
 * Landing path applied after a forced password change (first login). Fresh
 * role data wins over possibly-stale session claims; default admins
 * always land on /admin.
 */
export function landingPathForRole(role: {
  isDefaultAdmin: boolean;
  allowedTabs: string[];
  landingTab: string | null;
}): string {
  if (role.isDefaultAdmin) {
    return ADMIN_DEFAULT_PATH;
  }
  return resolveAdminLandingPath(role.allowedTabs, role.landingTab);
}
