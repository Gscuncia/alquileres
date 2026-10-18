/**
 * @vitest-environment node
 */

import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

type UserClaims = {
  id: string;
  email: string;
  roleName: string;
  roleId: string;
  allowedTabs: string[];
  isDefaultAdmin: boolean;
  mustChangePassword?: boolean;
};

type MiddlewareRequest = NextRequest & { auth: { user: UserClaims } | null };

const authConfig = {};

vi.mock("@/lib/auth.config", () => ({
  default: authConfig,
}));

vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: MiddlewareRequest) => Response | undefined) => handler,
  }),
}));

function makeUser(overrides: Partial<UserClaims> = {}): UserClaims {
  return {
    id: "user-1",
    email: "user@alquileresanita.com.ar",
    roleName: "Gestion diaria",
    roleId: "role-2",
    allowedTabs: ["calendario", "gastos"],
    isDefaultAdmin: false,
    mustChangePassword: false,
    ...overrides,
  };
}

describe("middleware", () => {
  async function loadMiddleware() {
    const middlewareModule = await import("@/middleware");
    return middlewareModule.default as unknown as (req: MiddlewareRequest) => Response | undefined;
  }

  function buildRequest(
    pathname: string,
    user?: UserClaims,
  ): MiddlewareRequest {
    const url = new URL(`http://localhost:3000${pathname}`);
    return {
      nextUrl: url,
      auth: user ? { user } : null,
    } as unknown as MiddlewareRequest;
  }

  it("redirects unauthenticated requests from /admin to /auth/signin", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/dashboard");

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/auth/signin");
  });

  it("allows default admins to access any /admin route", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/reservas", makeUser({
      roleName: "Administrador",
      roleId: "role-1",
      allowedTabs: ["panel", "calendario", "propiedades", "reservas", "huespedes", "destinatarios", "gastos"],
      isDefaultAdmin: true,
    }));

    const res = middleware(req);

    expect(res).toBeUndefined();
  });

  it("redirects users to /admin when they request a tab not in allowedTabs", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/reservas", makeUser());

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("allows users to access tabs listed in allowedTabs", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/calendario", makeUser());

    const res = middleware(req);

    expect(res).toBeUndefined();
  });

  it("allows users to access nested routes within an allowed tab", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/gastos/2026-01", makeUser());

    const res = middleware(req);

    expect(res).toBeUndefined();
  });

  it("allows users with the contexto tab to access /admin/contexto", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest(
      "/admin/contexto",
      makeUser({ allowedTabs: ["contexto"] }),
    );

    const res = middleware(req);

    expect(res).toBeUndefined();
  });

  it("redirects users without the contexto tab away from /admin/contexto", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/contexto", makeUser());

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("redirects users to /admin for unknown admin sub-routes", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/unknown", makeUser());

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("redirects non-admins from /admin/usuarios even if the tab is in allowedTabs", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest(
      "/admin/usuarios",
      makeUser({ allowedTabs: ["calendario", "gastos", "usuarios"] }),
    );

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/admin");
  });

  it("allows default admins to access /admin/usuarios and /admin/roles", async () => {
    const middleware = await loadMiddleware();

    const usersReq = buildRequest("/admin/usuarios", makeUser({
      roleName: "Administrador",
      roleId: "role-1",
      allowedTabs: ["panel", "calendario", "propiedades", "reservas", "huespedes", "destinatarios", "gastos"],
      isDefaultAdmin: true,
    }));
    const rolesReq = buildRequest("/admin/roles", makeUser({
      roleName: "Administrador",
      roleId: "role-1",
      allowedTabs: ["panel", "calendario", "propiedades", "reservas", "huespedes", "destinatarios", "gastos"],
      isDefaultAdmin: true,
    }));

    expect(middleware(usersReq)).toBeUndefined();
    expect(middleware(rolesReq)).toBeUndefined();
  });

  it("allows authenticated users that must change password to access any /admin route so the layout can show the modal", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/usuarios", makeUser({ mustChangePassword: true, allowedTabs: ["calendario", "gastos"] }));

    const res = middleware(req);

    expect(res).toBeUndefined();
  });
});
