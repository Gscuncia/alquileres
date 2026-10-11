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

  function buildRequest(pathname: string, authenticated = false): MiddlewareRequest {
    const url = new URL(`http://localhost:3000${pathname}`);
    return {
      nextUrl: url,
      auth: authenticated
        ? { user: { id: "1", email: "admin@alquileresanita.com.ar", role: "ADMIN" } }
        : null,
    } as unknown as MiddlewareRequest;
  }

  it("redirects unauthenticated requests from /admin to /auth/signin", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/dashboard", false);

    const res = middleware(req);

    expect(res).toBeInstanceOf(Response);
    expect(res?.status).toBe(302);
    expect(res?.headers.get("location")).toBe("http://localhost:3000/auth/signin");
  });

  it("allows authenticated requests to /admin", async () => {
    const middleware = await loadMiddleware();
    const req = buildRequest("/admin/dashboard", true);

    const res = middleware(req);

    expect(res).toBeUndefined();
  });
});
