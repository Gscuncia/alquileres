import { NextResponse } from "next/server";
import { buildBackupCsvs } from "@/lib/backup";
import { getContactSettings } from "@/lib/site-settings";
import { sendBackupEmail } from "@/lib/mail";
import { toDateStr, toTimeStr } from "@/lib/datetime";
import { prisma } from "@/lib/prisma";

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
    const now = new Date();
    const currentHour = Number(toTimeStr(now).slice(0, 2));
    const { backupEmail, backupHour, lastBackupSentAt } =
      await getContactSettings();

    // The scheduler ticks hourly and may run late (e.g. 14:05 when the
    // configured hour is 13), so instead of matching an exact hour we send on
    // the FIRST tick at-or-after the configured hour, once per BA calendar
    // day, tracked via the persisted lastBackupSentAt timestamp. A failed
    // send is retried on the next tick because the timestamp is only
    // persisted on success.
    const todayBa = toDateStr(now);
    const sentToday =
      lastBackupSentAt !== null && toDateStr(lastBackupSentAt) === todayBa;
    if (currentHour < backupHour || sentToday) {
      return NextResponse.json({ ok: true, skipped: true, currentHour, backupHour, sentToday });
    }

    const backup = await buildBackupCsvs();
    await sendBackupEmail(backupEmail, todayBa, backup);

    await prisma.siteSettings.update({
      where: { id: "default" },
      data: { lastBackupSentAt: now },
    });

    return NextResponse.json({
      ok: true,
      guests: backup.guestCount,
      bookings: backup.bookingCount,
      gastos: backup.expenseCount,
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
