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

  const isDefaultAdmin = user.isDefaultAdmin === true;
  if (isDefaultAdmin) {
    return;
  }

  const tab = getTabForPathname(nextUrl.pathname);
  if (tab === null || !user.allowedTabs?.includes(tab)) {
    return Response.redirect(new URL("/admin", nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
