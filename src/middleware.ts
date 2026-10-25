import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { ADMIN_TABS } from "@/lib/admin-tabs";

const { auth } = NextAuth(authConfig);

const DASHBOARD_TAB = "panel";

/**
 * Public origin for redirects. On Vercel, `nextUrl.origin` can carry the
 * internal production deployment URL (e.g. the *.vercel.app alias) instead
 * of the domain the user is actually browsing; the forwarded-host/proto
 * headers reflect the public origin reliably, so they win when present.
 */
function publicOrigin(req: { nextUrl: { origin: string }; headers?: Headers }): string {
  const forwardedHost = req.headers?.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const forwardedProto =
      req.headers?.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
    return `${forwardedProto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

function getTabForPathname(pathname: string): string | null {
  // The dashboard itself corresponds to the "panel" tab.
  if (pathname === "/admin" || pathname === "/admin/") {
    return DASHBOARD_TAB;
  }

  // Derived from the canonical registry so newly added tabs (e.g. feriados,
  // carga-gastos) are gated the same way without touching this file.
  for (const tab of ADMIN_TABS) {
    if (tab.href === "/admin") {
      continue;
    }
    if (pathname === tab.href || pathname.startsWith(`${tab.href}/`)) {
      return tab.id;
    }
  }

  return null;
}

function tabHref(tabId: string): string | null {
  return ADMIN_TABS.find((tab) => tab.id === tabId)?.href ?? null;
}

/**
 * Path a role-based user should land on when the requested tab is not
 * granted: the role's configured landing tab when it is still granted,
 * otherwise the first granted tab in canonical registry order, otherwise
 * the access-denied page (which also avoids a redirect loop on /admin).
 */
function resolveAdminLandingPath(
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
  return "/auth/access-denied";
}

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute && !isAuthenticated) {
    return Response.redirect(new URL("/auth/signin", publicOrigin(req)));
  }

  const user = req.auth?.user;
  if (!user) {
    return;
  }

  // The remainder of this middleware only governs admin routes.
  if (!isAdminRoute) {
    return;
  }

  // Users that must change their password are allowed into the admin shell
  // so the layout can show the forced password-change modal.
  if (user.mustChangePassword === true) {
    return;
  }

  const isDefaultAdmin = user.isDefaultAdmin === true;
  if (isDefaultAdmin) {
    return;
  }

  // Role and user management are reserved for default administrators.
  if (
    nextUrl.pathname === "/admin/usuarios" ||
    nextUrl.pathname.startsWith("/admin/usuarios/") ||
    nextUrl.pathname === "/admin/roles" ||
    nextUrl.pathname.startsWith("/admin/roles/")
  ) {
    return Response.redirect(new URL("/admin", publicOrigin(req)));
  }

  const tab = getTabForPathname(nextUrl.pathname);
  if (tab !== null && user.allowedTabs?.includes(tab)) {
    return;
  }

  // The tab is not granted. Route the user to their role's landing tab
  // (or the first granted tab) instead of a bare /admin, so roles without
  // the "panel" tab do not loop between /admin and the middleware. Requests
  // to unknown /admin sub-routes follow the same safe landing path.
  const landingPath = resolveAdminLandingPath(
    user.allowedTabs ?? [],
    user.landingTab,
  );
  if (landingPath === "/auth/access-denied") {
    return Response.redirect(
      new URL("/auth/access-denied", publicOrigin(req)),
    );
  }
  return Response.redirect(new URL(landingPath, publicOrigin(req)));
});

export const config = {
  matcher: ["/admin/:path*"],
};
