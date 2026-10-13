import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendMail = vi.hoisted(() => vi.fn());
const mockCreateTransport = vi.hoisted(() => vi.fn(() => ({ sendMail: mockSendMail })));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const ORIGINAL_ENV = process.env;

async function importMailModule() {
  const module = await import("@/lib/mail");
  return module;
}

async function resetMailModule() {
  vi.resetModules();
}

describe("mail helper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterEach(async () => {
    await resetMailModule();
    process.env = ORIGINAL_ENV;
  });

  it("creates a Gmail transporter when env vars are present", async () => {
    process.env.GMAIL_USER = "test@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "app-password";

    const { transporter, sendWelcomeEmail } = await importMailModule();

    expect(transporter).not.toBeNull();
    expect(mockCreateTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "test@gmail.com",
        pass: "app-password",
      },
    });

    mockSendMail.mockResolvedValue({});
    await sendWelcomeEmail("new@example.com", "anita1234");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const options = mockSendMail.mock.calls[0][0];
    expect(options.from).toContain("Alquileres Anita");
    expect(options.to).toBe("new@example.com");
    expect(options.subject).toBe("Tu cuenta de Alquileres Anita");
    expect(options.text).toContain("anita1234");
    expect(options.html).toContain("anita1234");
    expect(options.html).toContain("/auth/signin");
  });

  it("falls back to a console warning when SMTP is not configured", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { transporter, sendWelcomeEmail } = await importMailModule();

    expect(transporter).toBeNull();

    await sendWelcomeEmail("new@example.com", "anita1234");

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SMTP not configured"),
    );

    warnSpy.mockRestore();
  });

  it("uses NEXT_PUBLIC_SITE_URL in the login link", async () => {
    process.env.GMAIL_USER = "test@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "app-password";
    process.env.NEXT_PUBLIC_SITE_URL = "https://alquileresanita.com.ar";

    const { sendWelcomeEmail } = await importMailModule();

    mockSendMail.mockResolvedValue({});
    await sendWelcomeEmail("new@example.com", "anita1234");

    const options = mockSendMail.mock.calls[0][0];
    expect(options.html).toContain("https://alquileresanita.com.ar/auth/signin");
  });

  it("sends a reset email with the token link and origin", async () => {
    process.env.GMAIL_USER = "test@gmail.com";
    process.env.GMAIL_APP_PASSWORD = "app-password";

    const { sendResetEmail } = await importMailModule();

    mockSendMail.mockResolvedValue({});
    await sendResetEmail("user@example.com", "reset-token-123", "https://alquileresanita.com.ar");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const options = mockSendMail.mock.calls[0][0];
    expect(options.from).toContain("Alquileres Anita");
    expect(options.to).toBe("user@example.com");
    expect(options.subject).toBe("Recuperación de contraseña");
    expect(options.text).toContain("reset-token-123");
    expect(options.text).toContain("https://alquileresanita.com.ar/auth/reset?token=reset-token-123");
    expect(options.html).toContain("/auth/reset?token=reset-token-123");
  });

  it("falls back to a console warning when sending a reset email without SMTP", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { sendResetEmail } = await importMailModule();

    await sendResetEmail("user@example.com", "reset-token-123", "http://localhost:3000");

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("SMTP not configured"),
    );

    warnSpy.mockRestore();
  });
});
