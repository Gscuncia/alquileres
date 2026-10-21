import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  siteSettingsFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSettings: {
      findUnique: mocks.siteSettingsFindUnique,
    },
  },
}));

import { getContactSettings } from "@/lib/site-settings";
import { DEFAULT_CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/contact";

describe("getContactSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CONTACT_EMAIL;
    delete process.env.GMAIL_USER;
  });

  it("returns persisted values when they are non-empty", async () => {
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "5491100000000",
      backupEmail: "backup@alquileresanita.com.ar",
    });

    await expect(getContactSettings()).resolves.toEqual({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "5491100000000",
      backupEmail: "backup@alquileresanita.com.ar",
    });
  });

  it("queries the default singleton row", async () => {
    mocks.siteSettingsFindUnique.mockResolvedValue(null);

    await getContactSettings();

    expect(mocks.siteSettingsFindUnique).toHaveBeenCalledWith({
      where: { id: "default" },
      select: { inquiryEmail: true, whatsappPhone: true, backupEmail: true },
    });
  });

  it("falls back to CONTACT_EMAIL env when the persisted email is empty", async () => {
    process.env.CONTACT_EMAIL = "  env@fallback.com  ";
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "",
      whatsappPhone: "5491100000000",
      backupEmail: "",
    });

    const settings = await getContactSettings();

    expect(settings.inquiryEmail).toBe("env@fallback.com");
    expect(settings.whatsappPhone).toBe("5491100000000");
  });

  it("falls back to WHATSAPP_NUMBER when the persisted phone is empty", async () => {
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "",
      backupEmail: "",
    });

    const settings = await getContactSettings();

    expect(settings.whatsappPhone).toBe(WHATSAPP_NUMBER);
  });

  it("uses the persisted backupEmail when it is non-empty", async () => {
    process.env.GMAIL_USER = "gmail@example.com";
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "5491100000000",
      backupEmail: "  backup@otro.com  ",
    });

    const settings = await getContactSettings();

    expect(settings.backupEmail).toBe("backup@otro.com");
  });

  it("falls back to GMAIL_USER when the persisted backupEmail is empty", async () => {
    process.env.GMAIL_USER = " gmail@example.com ";
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "5491100000000",
      backupEmail: "",
    });

    const settings = await getContactSettings();

    expect(settings.backupEmail).toBe("gmail@example.com");
  });

  it("falls back to the default contact email when the persisted backupEmail and GMAIL_USER are empty", async () => {
    mocks.siteSettingsFindUnique.mockResolvedValue({
      inquiryEmail: "nuevo@alquileresanita.com.ar",
      whatsappPhone: "5491100000000",
      backupEmail: "",
    });

    const settings = await getContactSettings();

    expect(settings.backupEmail).toBe(DEFAULT_CONTACT_EMAIL);
  });

  it("falls back to the constants when there is no row and no env", async () => {
    mocks.siteSettingsFindUnique.mockResolvedValue(null);

    await expect(getContactSettings()).resolves.toEqual({
      inquiryEmail: DEFAULT_CONTACT_EMAIL,
      whatsappPhone: WHATSAPP_NUMBER,
      backupEmail: DEFAULT_CONTACT_EMAIL,
    });
  });

  it("falls back to constants when the database query throws", async () => {
    mocks.siteSettingsFindUnique.mockRejectedValue(new Error("connection refused"));

    await expect(getContactSettings()).resolves.toEqual({
      inquiryEmail: DEFAULT_CONTACT_EMAIL,
      whatsappPhone: WHATSAPP_NUMBER,
      backupEmail: DEFAULT_CONTACT_EMAIL,
    });
  });

  it("prefers the env email over the constant when the row is missing", async () => {
    process.env.CONTACT_EMAIL = "env@fallback.com";
    mocks.siteSettingsFindUnique.mockResolvedValue(null);

    const settings = await getContactSettings();

    expect(settings.inquiryEmail).toBe("env@fallback.com");
  });
});
