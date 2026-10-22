import type {
  Booking,
  Expense,
  ExpenseType,
  Guest,
  Property,
  TransferRecipient,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stayNights, formatInTz } from "@/lib/datetime";

const BOM = "\uFEFF";

export interface BackupData {
  guests: string;
  bookings: string;
  expenses: string;
  guestCount: number;
  bookingCount: number;
  expenseCount: number;
}

type BookingWithRelations = Booking & {
  property: Property;
  guest: Guest;
  depositTransferRecipient: TransferRecipient | null;
  restTransferRecipient: TransferRecipient | null;
};

type ExpenseWithRelations = Expense & {
  property: Property | null;
  expenseType: ExpenseType;
};

/**
 * Escapes a single CSV field: when it contains a comma, a double quote or a
 * line break, the field is wrapped in quotes and inner quotes are doubled.
 */
function escapeCsv(value: string): string {
  if (/["\r\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toCsv(headers: string[], rows: string[][]): string {
  const lines = [
    headers,
    ...rows,
  ].map((cells) => cells.map(escapeCsv).join(","));
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

/** Pure builder: guests CSV, not prefixed with BOM. */
export function buildGuestsCsvRows(rows: Guest[]): string[][] {
  return rows.map((guest) => [
    guest.id,
    guest.firstName,
    guest.lastName,
    guest.dni,
    guest.phone,
    guest.email ?? "",
    guest.notes ?? "",
  ]);
}

/** Pure builder: bookings CSV rows, not prefixed with BOM. */
export function buildBookingsCsvRows(rows: BookingWithRelations[]): string[][] {
  return rows.map((booking) => {
    const nights = stayNights(booking.checkIn, booking.checkOut);
    const total = Number(booking.pricePerNight) * nights;
    const deposit = Number(booking.depositAmount);
    const restDue = Math.max(0, total - deposit);

    const depositRecipient =
      booking.depositPaymentType === "TRANSFERENCIA"
        ? `Transferencia · ${booking.depositTransferRecipient?.name ?? ""}`
        : "Efectivo";
    const restRecipient =
      booking.restPaymentType === "TRANSFERENCIA"
        ? `Transferencia · ${booking.restTransferRecipient?.name ?? ""}`
        : "Efectivo";

    return [
      booking.id,
      booking.property.title,
      `${booking.guest.firstName} ${booking.guest.lastName}`.trim(),
      booking.guest.dni,
      formatInTz(booking.checkIn),
      formatInTz(booking.checkOut),
      String(nights),
      String(Number(booking.pricePerNight)),
      String(total),
      String(deposit),
      depositRecipient,
      booking.depositTransferRecipient?.name ?? "",
      String(restDue),
      restRecipient,
      booking.restTransferRecipient?.name ?? "",
      booking.notes ?? "",
    ];
  });
}

export function buildGuestsCsv(rows: Guest[]): string {
  return toCsv(
    ["Id", "Nombre", "Apellido", "DNI", "Teléfono", "Email", "Notas"],
    buildGuestsCsvRows(rows),
  );
}

export function buildBookingsCsv(rows: BookingWithRelations[]): string {
  return toCsv(
    [
      "Id",
      "Propiedad",
      "Huésped",
      "DNI",
      "Ingreso",
      "Egreso",
      "Noches",
      "Precio por noche",
      "Monto total",
      "Seña",
      "Pago de la seña",
      "Destinatario seña",
      "Monto para completar pago",
      "Pago restante",
      "Destinatario restante",
      "Notas",
    ],
    buildBookingsCsvRows(rows),
  );
}

/** Pure builder: expenses CSV rows, not prefixed with BOM. */
export function buildExpensesCsvRows(rows: ExpenseWithRelations[]): string[][] {
  // Same date display as the gastos admin list (dd/mm/yyyy in BA time).
  const dateDisplayOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  };

  return rows.map((expense) => [
    expense.id,
    expense.expenseType.name,
    expense.property?.title ?? "",
    expense.category,
    String(Number(expense.amount)),
    formatInTz(expense.date, dateDisplayOptions),
    expense.description ?? "",
  ]);
}

export function buildExpensesCsv(rows: ExpenseWithRelations[]): string {
  return toCsv(
    [
      "Id",
      "Tipo",
      "Propiedad",
      "Categoría",
      "Importe",
      "Fecha",
      "Descripción",
    ],
    buildExpensesCsvRows(rows),
  );
}

/**
 * Loads guests, bookings and expenses from the database and builds the three
 * daily backup CSVs (BOM-prefixed UTF-8).
 */
export async function buildBackupCsvs(): Promise<BackupData> {
  const guests = await prisma.guest.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const bookings = await prisma.booking.findMany({
    include: {
      property: true,
      guest: true,
      depositTransferRecipient: true,
      restTransferRecipient: true,
    },
    orderBy: { checkIn: "asc" },
  });

  const expenses = await prisma.expense.findMany({
    include: { property: true, expenseType: true },
    orderBy: { date: "desc" },
  });

  return {
    guests: buildGuestsCsv(guests),
    bookings: buildBookingsCsv(bookings),
    expenses: buildExpensesCsv(expenses),
    guestCount: guests.length,
    bookingCount: bookings.length,
    expenseCount: expenses.length,
  };
}
