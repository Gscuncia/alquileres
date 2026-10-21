import { prisma } from "@/lib/prisma";
import { WHATSAPP_NUMBER, DEFAULT_CONTACT_EMAIL } from "@/lib/contact";

export interface ContactSettings {
  inquiryEmail: string;
  whatsappPhone: string;
  backupEmail: string;
  backupHour: number;
  lastBackupSentAt: Date | null;
}

const DEFAULT_BACKUP_HOUR = 8;

function pickBackupHour(persisted: unknown): number {
  return Number.isInteger(persisted) &&
    (persisted as number) >= 0 &&
    (persisted as number) <= 23
    ? (persisted as number)
    : DEFAULT_BACKUP_HOUR;
}

function trimEnv(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function pick(persisted: string, envValue: string, constant: string): string {
  if (persisted.trim()) return persisted.trim();
  if (envValue) return envValue;
  return constant;
}

/**
 * Resolves the site-wide contact destinations from the singleton
 * `site_settings` row, falling back to environment variables and then to
 * compile-time constants. Never throws: any database error degrades to the
 * env/constant fallbacks.
 */
export async function getContactSettings(): Promise<ContactSettings> {
  let persisted: {
    inquiryEmail: string;
    whatsappPhone: string;
    backupEmail: string;
    backupHour: number;
    lastBackupSentAt: Date | null;
  } | null = null;
  try {
    persisted = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: {
        inquiryEmail: true,
        whatsappPhone: true,
        backupEmail: true,
        backupHour: true,
        lastBackupSentAt: true,
      },
    });
  } catch {
    persisted = null;
  }

  return {
    inquiryEmail: pick(
      persisted?.inquiryEmail ?? "",
      trimEnv(process.env.CONTACT_EMAIL),
      DEFAULT_CONTACT_EMAIL,
    ),
    whatsappPhone: pick(persisted?.whatsappPhone ?? "", "", WHATSAPP_NUMBER),
    backupEmail: pick(
      persisted?.backupEmail ?? "",
      trimEnv(process.env.GMAIL_USER),
      DEFAULT_CONTACT_EMAIL,
    ),
    backupHour: pickBackupHour(persisted?.backupHour),
    lastBackupSentAt:
      persisted?.lastBackupSentAt instanceof Date
        ? persisted.lastBackupSentAt
        : null,
  };
}
