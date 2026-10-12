import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute && !isAuthenticated) {
    return Response.redirect(new URL("/auth/signin", nextUrl.origin));
  }

  if (isAdminRoute && req.auth?.user?.role !== "ADMIN") {
    return Response.redirect(new URL("/auth/access-denied", nextUrl.origin));
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
