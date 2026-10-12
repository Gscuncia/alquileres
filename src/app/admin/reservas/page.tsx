import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { getAllPropertiesForAdmin } from "@/lib/properties-db";
import { formatInTz, toUtc } from "@/lib/datetime";
import { normalizeForSearch } from "@/lib/search";
import { deleteBooking } from "@/app/admin/bookings/actions";
import { ConfirmButton } from "@/components/admin/ConfirmButton";

const VALID_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface ReservasPageProps {
  searchParams?: { propiedad?: string; desde?: string; hasta?: string; q?: string };
}

const tableCellClasses = "border-b border-hairline px-4 py-3 text-body-sm text-body";

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

/** Exclusive upper bound `00:00 (UTC-3)` of the day AFTER the selected date. */
function endOfDayExclusive(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return toUtc(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`, "00:00");
}

export default async function ReservasPage({ searchParams }: ReservasPageProps) {
  await requireAdmin();

  const propiedad = searchParams?.propiedad?.trim() ?? "";
  const desde = VALID_DATE.test(searchParams?.desde ?? "")
    ? (searchParams?.desde as string)
    : "";
  const hasta = VALID_DATE.test(searchParams?.hasta ?? "")
    ? (searchParams?.hasta as string)
    : "";
  const q = searchParams?.q?.trim() ?? "";

  const where: {
    propertyId?: string;
    checkIn?: { gte: Date; lt: Date };
  } = {};

  if (propiedad) {
    where.propertyId = propiedad;
  }
  if (desde || hasta) {
    where.checkIn = {
      ...(desde ? { gte: toUtc(desde, "00:00") } : {}),
      ...(hasta ? { lt: endOfDayExclusive(hasta) } : {}),
    } as { gte: Date; lt: Date };
  }
  const hasStructuredFilters = Boolean(propiedad || desde || hasta);
  const hasFilters = hasStructuredFilters || Boolean(q);

  const [bookingRows, properties] = await Promise.all([
    prisma.booking.findMany({
      // Structured filters go to the database; the text query `q` is applied
      // in TypeScript below (accent-insensitive via normalizeForSearch).
      where: hasStructuredFilters ? where : undefined,
      include: { property: true, transferRecipient: true, guest: true },
      orderBy: { checkIn: "desc" },
    }),
    getAllPropertiesForAdmin(),
  ]);

  // Accent- and case-insensitive text search over the guest fields.
  const bookings = q
    ? bookingRows.filter((booking) =>
        [
          booking.guest.firstName,
          booking.guest.lastName,
          booking.guest.dni,
        ].some((field) =>
          normalizeForSearch(field).includes(normalizeForSearch(q)),
        ),
      )
    : bookingRows;

  return (
    <div className="space-y-6">
      <h2 className="text-display-sm font-semibold text-ink">Reservas</h2>

      <form
        method="get"
        action="/admin/reservas"
        className="grid grid-cols-1 gap-4 rounded-md border border-hairline bg-canvas p-4 md:grid-cols-5"
      >
        <div>
          <label htmlFor="propiedad" className={labelClasses}>
            Propiedad
          </label>
          <select
            id="propiedad"
            name="propiedad"
            defaultValue={propiedad}
            className={inputClasses}
          >
            <option value="">Todas</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="desde" className={labelClasses}>
            Ingreso desde
          </label>
          <input
            id="desde"
            name="desde"
            type="date"
            defaultValue={desde}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="hasta" className={labelClasses}>
            Ingreso hasta
          </label>
          <input
            id="hasta"
            name="hasta"
            type="date"
            defaultValue={hasta}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="q" className={labelClasses}>
            Huésped o DNI
          </label>
          <input
            id="q"
            name="q"
            type="text"
            placeholder="perez / 32456778"
            defaultValue={q}
            className={inputClasses}
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-sm border border-ink bg-canvas px-4 py-2 text-button-sm font-medium text-ink hover:bg-surface-soft"
          >
            Aplicar
          </button>
          <Link
            href="/admin/reservas"
            className="px-2 py-2 text-button-sm text-muted underline-offset-2 hover:underline"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {bookings.length === 0 ? (
        <div className="rounded-md border border-hairline bg-surface-soft p-6 text-body-md text-body">
          {hasFilters
            ? "No hay reservas que coincidan con los filtros."
            : "Todavía no hay reservas cargadas."}
        </div>
      ) : (
        <table className="w-full rounded-md border border-hairline bg-canvas">
          <thead>
            <tr className="bg-surface-soft text-left">
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Propiedad</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Huésped</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">DNI</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Ingreso</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Egreso</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Pago</th>
              <th className="border-b border-hairline px-4 py-3 text-caption-sm font-semibold text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className={`${tableCellClasses} text-ink`}>{booking.property.title}</td>
                <td className={tableCellClasses}>
                  {booking.guest.firstName} {booking.guest.lastName}
                </td>
                <td className={tableCellClasses}>{booking.guest.dni}</td>
                <td className={tableCellClasses}>{formatInTz(booking.checkIn)}</td>
                <td className={tableCellClasses}>{formatInTz(booking.checkOut)}</td>
                <td className={tableCellClasses}>
                  {booking.paymentType === "TRANSFERENCIA"
                    ? `Transferencia${booking.transferRecipient ? ` · ${booking.transferRecipient.name}` : ""}`
                    : "Efectivo"}
                </td>
                <td className={tableCellClasses}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/propiedades/${booking.propertyId}/agenda?reserva=${booking.id}`}
                      className="text-button-sm text-ink underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={deleteBooking}>
                      <input type="hidden" name="id" value={booking.id} />
                      <input type="hidden" name="redirectTo" value="/admin/reservas" />
                      <ConfirmButton />
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
