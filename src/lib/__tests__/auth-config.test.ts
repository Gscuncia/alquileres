import { describe, it, expect } from "vitest";
import authConfig from "@/lib/auth.config";

// Auth.js calls the redirect callback with the normalized callback URL and
// the configured base URL. Relative URLs must pass through so the browser
// stays on the domain the user is browsing (the base URL on Vercel can be
// the internal production alias).
describe("authConfig redirect callback", () => {
  const redirect = authConfig.callbacks.redirect as (args: {
    url: string;
    baseUrl: string;
  }) => Promise<string>;

  it("passes relative URLs through unchanged", async () => {
    expect(await redirect({ url: "/admin", baseUrl: "https://alquileres-sepia.vercel.app" })).toBe("/admin");
    expect(await redirect({ url: "/admin/reservas", baseUrl: "https://alquileres-sepia.vercel.app" })).toBe("/admin/reservas");
  });

  it("keeps URLs that belong to the configured base", async () => {
    const base = "https://www.alquileresanita.com.ar";
    expect(await redirect({ url: `${base}/admin`, baseUrl: base })).toBe(`${base}/admin`);
  });

  it("falls back to the base for foreign URLs", async () => {
    expect(
      await redirect({ url: "https://evil.example.com/phish", baseUrl: "https://www.alquileresanita.com.ar" }),
    ).toBe("https://www.alquileresanita.com.ar");
  });
});
