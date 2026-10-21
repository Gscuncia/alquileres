import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  buildBackupCsvs: vi.fn(),
  sendBackupEmail: vi.fn(),
  getContactSettings: vi.fn(),
}));

vi.mock("@/lib/backup", () => ({
  buildBackupCsvs: () => mocks.buildBackupCsvs(),
}));

vi.mock("@/lib/mail", () => ({
  sendBackupEmail: (...args: [string, string, unknown]) =>
    mocks.sendBackupEmail(...args),
}));

vi.mock("@/lib/site-settings", () => ({
  getContactSettings: () => mocks.getContactSettings(),
}));

import { GET } from "@/app/api/cron/backup/route";

const backup = {
  guests: "csv-guests",
  bookings: "csv-bookings",
  guestCount: 7,
  bookingCount: 3,
};

function requestWith(header?: string): Request {
  const headers: Record<string, string> = {};
  if (header !== undefined) {
    headers.authorization = header;
  }
  return new Request("http://localhost/api/cron/backup", {
    headers,
  });
}

describe("GET /api/cron/backup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret-token";
    mocks.buildBackupCsvs.mockResolvedValue(backup);
    mocks.sendBackupEmail.mockResolvedValue(undefined);
    mocks.getContactSettings.mockResolvedValue({
      inquiryEmail: "contacto@alquileresanita.com.ar",
      whatsappPhone: "5491155052228",
      backupEmail: "backup@alquileresanita.com.ar",
    });
  });

  it("returns 401 without the Authorization header", async () => {
    const response = await GET(requestWith());

    expect(response.status).toBe(401);
    expect(mocks.buildBackupCsvs).not.toHaveBeenCalled();
    expect(mocks.sendBackupEmail).not.toHaveBeenCalled();
  });

  it("returns 401 with a wrong secret", async () => {
    const response = await GET(requestWith("Bearer wrong-secret"));

    expect(response.status).toBe(401);
    expect(mocks.buildBackupCsvs).not.toHaveBeenCalled();
  });

  it("denies with 500 when CRON is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(requestWith("Bearer secret-token"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "CRON no configurado",
    });
  });

  it("sends the backup email and returns the counts with a valid header", async () => {
    const response = await GET(requestWith("Bearer secret-token"));

    expect(response.status).toBe(200);
    expect(mocks.getContactSettings).toHaveBeenCalled();
    expect(mocks.sendBackupEmail).toHaveBeenCalledWith(
      "backup@alquileresanita.com.ar",
      expect.any(String),
      backup,
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      guests: 7,
      bookings: 3,
    });
  });

  it("returns 500 when the builder throws", async () => {
    // Silence the route's error logging for this failure case.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.buildBackupCsvs.mockRejectedValue(new Error("db down"));

    const response = await GET(requestWith("Bearer secret-token"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: "Error generando el backup",
    });
    expect(mocks.sendBackupEmail).not.toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
