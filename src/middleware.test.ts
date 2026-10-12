/**
 * @vitest-environment node
 */

import { describe, it, expect, vi } from "vitest";
import type { NextRequest } from "next/server";

type MiddlewareRequest = NextRequest & { auth: { user: { id: string; email: string; role: string } } | null };

const authConfig = {};

vi.mock("@/lib/auth.config", () => ({
  default: authConfig,
}));

vi.mock("next-auth", () => ({
  default: () => ({
    auth: (handler: (req: MiddlewareRequest) => Response | undefined) => handler,
  }),
}));

describe("middleware", () => {
  async function loadMiddleware() {
    const middlewareModule = await import("@/middleware");
    return middlewareModule.default as unknown as (req: MiddlewareRequest) => Response | undefined;
  }

  function buildRequest(
    pathname: string,
    user?: { id: string; email: string; role: string },
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

  it("redirects authenticated OPERATIVE users to /auth/access-denied", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/reservas", {
      id: "2",
      email: "operative@alquileresanita.com.ar",
      role: "OPERATIVE",
    });

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/auth/access-denied");
  });

  it("allows authenticated ADMIN requests to /admin", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/dashboard", {
      id: "1",
      email: "admin@alquileresanita.com.ar",
      role: "ADMIN",
    });

    const res = middleware(req);

    expect(res).toBeUndefined();
  });
});
