import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  buildBackupCsvs: vi.fn(),
  sendBackupEmail: vi.fn(),
  getContactSettings: vi.fn(),
  toTimeStr: vi.fn(),
  toDateStr: vi.fn(),
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

vi.mock("@/lib/datetime", () => ({
  toTimeStr: (date: Date) => mocks.toTimeStr(date),
  toDateStr: (date: Date) => mocks.toDateStr(date),
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
      backupHour: 8,
    });
    mocks.toTimeStr.mockReturnValue("08:00");
    mocks.toDateStr.mockReturnValue("2026-10-21");
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

  it("skips without building or sending when the current BA hour differs from the configured one", async () => {
    mocks.toTimeStr.mockReturnValue("09:00");
    mocks.getContactSettings.mockResolvedValue({
      inquiryEmail: "contacto@alquileresanita.com.ar",
      whatsappPhone: "5491155052228",
      backupEmail: "backup@alquileresanita.com.ar",
      backupHour: 8,
    });

    const response = await GET(requestWith("Bearer secret-token"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: true,
      currentHour: 9,
      backupHour: 8,
    });
    expect(mocks.buildBackupCsvs).not.toHaveBeenCalled();
    expect(mocks.sendBackupEmail).not.toHaveBeenCalled();
  });

  it("sends the backup when the current BA hour matches the configured one", async () => {
    mocks.toTimeStr.mockReturnValue("15:30");
    mocks.getContactSettings.mockResolvedValue({
      inquiryEmail: "contacto@alquileresanita.com.ar",
      whatsappPhone: "5491155052228",
      backupEmail: "backup@alquileresanita.com.ar",
      backupHour: 15,
    });

    const response = await GET(requestWith("Bearer secret-token"));

    expect(response.status).toBe(200);
    expect(mocks.buildBackupCsvs).toHaveBeenCalled();
    expect(mocks.sendBackupEmail).toHaveBeenCalledWith(
      "backup@alquileresanita.com.ar",
      "2026-10-21",
      backup,
    );
    await expect(response.json()).resolves.toEqual({
      ok: true,
      guests: 7,
      bookings: 3,
    });
  });
});
