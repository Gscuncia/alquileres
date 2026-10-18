import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { toDateStr, toUtc, formatInTz } from "@/lib/datetime";
import {
  formatMoney,
  nightsInPeriod,
  occupancyPerProperty,
  revenuePerProperty,
  monthlyTrend,
  upcomingMoves,
  expensesTotal,
  toBookingSnapshot,
  toExpenseSnapshot,
} from "@/lib/metrics";
import {
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { Button } from "@/components/design-system";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AdminDashboardPageProps {
  searchParams?: { from?: string; to?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

/**
 * First day of the calendar month following `dateStr` (fixed UTC-3), used
 * as the EXCLUSIVE upper bound of a period [from, to).
 */
function nextMonthStart(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

const trendLabelFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function trendMonthLabel(monthKey: string): string {
  // `${key}-01` read at UTC-00:00 is exact for a calendar-month label; TZ is
  // pinned to UTC so formatting cannot shift the month.
  return trendLabelFormatter.format(new Date(`${monthKey}-01T00:00:00Z`));
}

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  await requireAdmin();

  // Default period: the current calendar month (Buenos Aires), as [from, to).
  const todayStr = toDateStr(new Date());
  const currentMonthStart = `${todayStr.slice(0, 7)}-01`;
  const from = VALID_DATE.test(searchParams?.from ?? "")
    ? (searchParams?.from as string)
    : currentMonthStart;
  const to = VALID_DATE.test(searchParams?.to ?? "")
    ? (searchParams?.to as string)
    : nextMonthStart(from);

  const fromInstant = toUtc(from, "00:00");
  const toInstant = toUtc(to, "00:00"); // exclusive upper bound

  // The upcoming-moves widget always looks at the next 14 days from now,
  // regardless of the selected period, so it needs its own (small) fetch.
  const now = new Date();
  const movesEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  // The monthly trend covers the last 6 calendar months, so its bookings
  // window starts 5 months before the current BA month (API windows are
  // rebuilt inside monthlyTrend itself).
  const [todayYear, todayMonth] = todayStr.split("-").map(Number);
  const trendZeroBased = todayMonth - 1 - 5;
  const trendStartYear = todayYear + Math.floor(trendZeroBased / 12);
  const trendStartMonth = ((trendZeroBased % 12) + 12) % 12 + 1;
  const trendStart = toUtc(
    `${trendStartYear}-${String(trendStartMonth).padStart(2, "0")}-01`,
    "00:00",
  );
  const trendEnd = toUtc(nextMonthStart(currentMonthStart), "00:00");

  const [bookingRows, expenseRows, moveRows, trendRows, properties] =
    await Promise.all([
      prisma.booking.findMany({
        // Stays overlapping the period: checkOut > from && checkIn < to.
        where: {
          checkOut: { gt: fromInstant },
          checkIn: { lt: toInstant },
        },
        orderBy: { checkIn: "asc" },
        include: { guest: { select: { firstName: true, lastName: true } } },
      }),
      prisma.expense.findMany({
        where: { date: { gte: fromInstant, lt: toInstant } },
      }),
      prisma.booking.findMany({
        where: {
          checkOut: { gt: now },
          checkIn: { lt: movesEnd },
        },
        orderBy: { checkIn: "asc" },
        include: { guest: { select: { firstName: true, lastName: true } } },
      }),
      prisma.booking.findMany({
        where: {
          checkOut: { gt: trendStart },
          checkIn: { lt: trendEnd },
        },
        orderBy: { checkIn: "asc" },
        include: { guest: { select: { firstName: true, lastName: true } } },
      }),
      getAllPropertiesForAdmin(),
    ]);

  const bookings = bookingRows.map(toBookingSnapshot);
  const expenses = expenseRows.map(toExpenseSnapshot);
  const moveBookings = moveRows.map(toBookingSnapshot);

  const periodNights = nightsInPeriod(fromInstant, toInstant);
  const revenue = revenuePerProperty(bookings, fromInstant, toInstant);
  const occupancy = occupancyPerProperty(
    bookings,
    fromInstant,
    toInstant,
    periodNights,
  );
  const moves = upcomingMoves(moveBookings, now);
  const trend = monthlyTrend(
    trendRows.map(toBookingSnapshot),
    now,
  );
  const totalRevenue = Array.from(revenue.values()).reduce((a, b) => a + b, 0);
  const totalExpenses = expensesTotal(expenses);
  const trendMax = Math.max(...trend.map((point) => point.revenue), 1);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Panel de administración" />

      <form
        method="get"
        action="/admin"
        className="grid grid-cols-1 items-end gap-4 rounded-md border border-hairline bg-canvas p-4 md:grid-cols-3"
      >
        <AdminField label="Desde" htmlFor="from">
          <AdminInput
            id="from"
            name="from"
            type="date"
            defaultValue={from}
          />
        </AdminField>
        <AdminField label="Hasta" htmlFor="to">
          <AdminInput
            id="to"
            name="to"
            type="date"
            defaultValue={to}
          />
        </AdminField>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="secondary">
            Aplicar
          </Button>
          <Button asChild variant="tertiary">
            <Link href="/admin">Mes actual</Link>
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminPanel title="Ingresos del período">
          <p className="text-display-sm font-semibold text-ink">
            {formatMoney(totalRevenue)}
          </p>
          <p className="mt-1 text-caption-sm text-muted">
            {periodNights} noches en el período seleccionado.
          </p>
        </AdminPanel>
        <AdminPanel title="Gastos vs ingresos">
          <p className="text-body-md text-body">
            Ingresos: <span className="text-ink">{formatMoney(totalRevenue)}</span>
          </p>
          <p className="text-body-md text-body">
            Gastos: <span className="text-ink">{formatMoney(totalExpenses)}</span>
          </p>
          <p className="mt-1 text-body-md font-medium text-ink">
            Resultado: {formatMoney(totalRevenue - totalExpenses)}
          </p>
        </AdminPanel>
      </div>

      <AdminPanel title="Ingresos y ocupación por propiedad">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-soft text-left">
              <th className="border-b border-hairline px-4 py-2 text-caption-sm font-semibold text-ink">Propiedad</th>
              <th className="border-b border-hairline px-4 py-2 text-caption-sm font-semibold text-ink">Ingresos</th>
              <th className="border-b border-hairline px-4 py-2 text-caption-sm font-semibold text-ink">Ocupación</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr>
                <td colSpan={3} className={`${tableCellClasses} text-center`}>
                  No hay propiedades cargadas todavía.
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  <td className={`${tableCellClasses} text-ink`}>
                    {property.title}
                  </td>
                  <td className={tableCellClasses}>
                    {formatMoney(revenue.get(property.id) ?? 0)}
                  </td>
                  <td className={tableCellClasses}>
                    {Math.round(
                      (occupancy.get(property.id) ?? 0) * 100,
                    )}
                    %
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminPanel>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminPanel title="Ingresos próximos">
          {moves.checkIns.length === 0 ? (
            <p className="text-body-md text-body">
              Sin ingresos en los próximos 14 días.
            </p>
          ) : (
            <ul className="space-y-2">
              {moves.checkIns.map((booking) => (
                <li
                  key={`in-${booking.id}`}
                  className="text-body-sm text-body"
                >
                  {formatInTz(booking.checkIn, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })}{" "}
                  · {booking.firstName} {booking.lastName}
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
        <AdminPanel title="Egresos próximos">
          {moves.checkOuts.length === 0 ? (
            <p className="text-body-md text-body">
              Sin egresos en los próximos 14 días.
            </p>
          ) : (
            <ul className="space-y-2">
              {moves.checkOuts.map((booking) => (
                <li
                  key={`out-${booking.id}`}
                  className="text-body-sm text-body"
                >
                  {formatInTz(booking.checkOut, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                  })}{" "}
                  · {booking.firstName} {booking.lastName}
                </li>
              ))}
            </ul>
          )}
        </AdminPanel>
      </div>

      <AdminPanel title="Tendencia de ingresos (últimos 6 meses)">
        <ul className="space-y-2">
          {trend.map((point) => (
            <li key={point.month} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-body-sm text-body">
                {trendMonthLabel(point.month)}
              </span>
              <span className="h-3 flex-1 overflow-hidden rounded-sm bg-surface-soft">
                <span
                  className="block h-full bg-ink"
                  style={{
                    width: `${Math.round((point.revenue / trendMax) * 100)}%`,
                  }}
                />
              </span>
              <span className="shrink-0 text-body-sm text-ink">
                {formatMoney(point.revenue)}
              </span>
            </li>
          ))}
        </ul>
      </AdminPanel>
    </div>
  );
}
