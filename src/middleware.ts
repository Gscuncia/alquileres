import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const TAB_ROUTE_PREFIXES = [
  { prefix: "/admin/calendario", tab: "calendario" },
  { prefix: "/admin/propiedades", tab: "propiedades" },
  { prefix: "/admin/reservas", tab: "reservas" },
  { prefix: "/admin/huespedes", tab: "huespedes" },
  { prefix: "/admin/destinatarios", tab: "destinatarios" },
  { prefix: "/admin/gastos", tab: "gastos" },
  { prefix: "/admin/usuarios", tab: "usuarios" },
  { prefix: "/admin/roles", tab: "roles" },
] as const;

function getTabForPathname(pathname: string): string | null {
  // The dashboard itself does not correspond to a restricted tab.
  if (pathname === "/admin" || pathname === "/admin/") {
    return "panel";
  }

  for (const { prefix, tab } of TAB_ROUTE_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return tab;
    }
  }

  return null;
}

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute && !isAuthenticated) {
    return Response.redirect(new URL("/auth/signin", nextUrl.origin));
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
    return Response.redirect(new URL("/admin", nextUrl.origin));
  }

  const tab = getTabForPathname(nextUrl.pathname);
  if (tab === null || !user.allowedTabs?.includes(tab)) {
    return Response.redirect(new URL("/admin", nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
