import { NextResponse } from "next/server";
import { buildBackupCsvs } from "@/lib/backup";
import { getContactSettings } from "@/lib/site-settings";
import { sendBackupEmail } from "@/lib/mail";
import { toDateStr, toTimeStr } from "@/lib/datetime";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: process.env.CRON_SECRET
          ? "No autorizado"
          : "CRON no configurado",
      },
      { status: process.env.CRON_SECRET ? 401 : 500 },
    );
  }

  try {
    const currentHour = Number(toTimeStr(new Date()).slice(0, 2));
    const { backupEmail, backupHour } = await getContactSettings();

    // The scheduler ticks hourly; only build/send on the configured hour so
    // the remaining 23 ticks stay cheap no-ops.
    if (currentHour !== backupHour) {
      return NextResponse.json({ ok: true, skipped: true, currentHour, backupHour });
    }

    const backup = await buildBackupCsvs();
    await sendBackupEmail(backupEmail, toDateStr(new Date()), backup);

    return NextResponse.json({
      ok: true,
      guests: backup.guestCount,
      bookings: backup.bookingCount,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[cron/backup] Failed to generate backup:", error);
    return NextResponse.json(
      { error: "Error generando el backup" },
      { status: 500 },
    );
  }
}
