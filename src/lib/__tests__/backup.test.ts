import { describe, it, expect, vi } from "vitest";
import type { Guest } from "@prisma/client";
import {
  buildGuestsCsv,
  buildBookingsCsv,
  buildExpensesCsv,
  buildBackupCsvs,
} from "@/lib/backup";
import { formatInTz, toUtc } from "@/lib/datetime";

const mocks = vi.hoisted(() => ({
  guestFindMany: vi.fn(),
  bookingFindMany: vi.fn(),
  expenseFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guest: { findMany: mocks.guestFindMany },
    booking: { findMany: mocks.bookingFindMany },
    expense: { findMany: mocks.expenseFindMany },
  },
}));

function escapeCell(value: string): string {
  if (/["\r\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function expectedRow(cells: string[]): string {
  return cells.map(escapeCell).join(",");
}

function buildGuest(overrides: Partial<Guest> = {}): Guest {
  return {
    id: "guest-1",
    firstName: "Juan",
    lastName: "Pérez",
    dni: "30123456",
    phone: "+54 9 11 5505-2228",
    email: "juan@example.com",
    notes: null,
    ...overrides,
  };
}

function buildBooking(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "booking-1",
    propertyId: "property-1",
    property: {
      id: "property-1",
      title: "Departamento Palermo",
    },
    guestId: "guest-1",
    guest: buildGuest(),
    checkIn: toUtc("2026-10-20", "12:00"),
    checkOut: toUtc("2026-10-22", "10:00"),
    pricePerNight: 50000,
    depositPaymentType: "EFECTIVO",
    depositPaymentMethod: null,
    depositTransferRecipientId: null,
    depositTransferRecipient: null,
    depositAmount: 20000,
    restPaymentType: "EFECTIVO",
    restTransferRecipientId: null,
    restTransferRecipient: null,
    notes: null,
    settledAt: null,
    createdAt: toUtc("2026-10-01", "00:00"),
    ...overrides,
  };
}

describe("buildGuestsCsv", () => {
  it("writes BOM + headers and one CRLF row per guest", () => {
    const csv = buildGuestsCsv([
      buildGuest(),
      buildGuest({ id: "guest-2", firstName: "Ana", email: null }),
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(
      csv.startsWith(
        "\uFEFFId,Nombre,Apellido,DNI,Teléfono,Email,Notas\r\n",
      ),
    ).toBe(true);
  });

  it("maps guest columns in order, empty string for null email/notes", () => {
    const csv = buildGuestsCsv([buildGuest({ email: null, notes: null })]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "guest-1",
        "Juan",
        "Pérez",
        "30123456",
        "+54 9 11 5505-2228",
        "",
        "",
      ]),
    );
  });

  it("keeps the full email and notes when present", () => {
    const csv = buildGuestsCsv([
      buildGuest({
        email: "doctor.who@gmail.com.ar",
        notes: "Llegó antes de tiempo",
      }),
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "guest-1",
        "Juan",
        "Pérez",
        "30123456",
        "+54 9 11 5505-2228",
        "doctor.who@gmail.com.ar",
        "Llegó antes de tiempo",
      ]),
    );
  });

  it("quotes fields containing commas and doubles inner quotes", () => {
    const csv = buildGuestsCsv([
      buildGuest({ notes: 'Cumpleaños, "fiesta en el patio"' }),
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "guest-1",
        "Juan",
        "Pérez",
        "30123456",
        "+54 9 11 5505-2228",
        "juan@example.com",
        'Cumpleaños, "fiesta en el patio"',
      ]),
    );
  });
});

describe("buildBookingsCsv", () => {
  const checkIn = toUtc("2026-10-20", "12:00");
  const checkOut = toUtc("2026-10-22", "10:00");

  it("writes BOM + flattened headers", () => {
    const csv = buildBookingsCsv([buildBooking() as never]);

    expect(
      csv.startsWith(
        "\uFEFFId,Propiedad,Huésped,DNI,Ingreso,Egreso,Noches,Precio por noche,Monto total,Seña,Pago de la seña,Destinatario seña,Monto para completar pago,Pago restante,Destinatario restante,Notas\r\n",
      ),
    ).toBe(true);
  });

  it("computes nights, total and rest amount; efectivo when no transfer", () => {
    const csv = buildBookingsCsv([buildBooking() as never]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "booking-1",
        "Departamento Palermo",
        "Juan Pérez",
        "30123456",
        formatInTz(checkIn),
        formatInTz(checkOut),
        "2",
        "50000",
        "100000",
        "20000",
        "Efectivo",
        "",
        "80000",
        "Efectivo",
        "",
        "",
      ]),
    );
  });

  it("shows transfer cells with recipient names", () => {
    const csv = buildBookingsCsv([
      buildBooking({
        depositPaymentType: "TRANSFERENCIA",
        depositTransferRecipient: { id: "recipient-1", name: "Anita" },
        restPaymentType: "TRANSFERENCIA",
        restTransferRecipient: { id: "recipient-2", name: "Marta" },
      }) as never,
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toContain("Transferencia · Anita");
    expect(lines[1]).toContain("Transferencia · Marta");
  });

  it("shows empty recipient names and rest amount 0 when fully deposited", () => {
    const csv = buildBookingsCsv([
      buildBooking({
        depositPaymentType: "TRANSFERENCIA",
        depositTransferRecipient: null,
        restTransferRecipient: null,
        depositAmount: 100000,
      }) as never,
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "booking-1",
        "Departamento Palermo",
        "Juan Pérez",
        "30123456",
        formatInTz(checkIn),
        formatInTz(checkOut),
        "2",
        "50000",
        "100000",
        "100000",
        "Transferencia · ",
        "",
        "0",
        "Efectivo",
        "",
        "",
      ]),
    );
  });

  it("quotes booking notes containing commas", () => {
    const csv = buildBookingsCsv([
      buildBooking({ notes: "Seña por transferencia, pendiente" }) as never,
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1].endsWith('"Seña por transferencia, pendiente"')).toBe(true);
  });
});

function buildExpense(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    id: "expense-1",
    propertyId: "property-1",
    property: {
      id: "property-1",
      title: "Departamento Palermo",
    },
    expenseTypeId: "type-1",
    expenseType: { id: "type-1", name: "Gas" },
    category: "Servicios",
    description: "Tanque de gas",
    amount: 15000.5,
    date: expenseDate,
    ...overrides,
  };
}

const expenseDate = toUtc("2026-10-12", "10:30");

// Same date display options as the gastos admin list Fecha column.
function expenseDateMatchesPage(date: Date): string {
  return formatInTz(date, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

describe("buildExpensesCsv", () => {
  it("writes BOM + headers in the gastos list order", () => {
    const csv = buildExpensesCsv([buildExpense() as never]);

    expect(
      csv.startsWith(
        "\uFEFFId,Tipo,Propiedad,Categoría,Importe,Fecha,Descripción\r\n",
      ),
    ).toBe(true);
  });

  it("maps expense columns and formats amount/date like the gastos page", () => {
    const csv = buildExpensesCsv([buildExpense() as never]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "expense-1",
        "Gas",
        "Departamento Palermo",
        "Servicios",
        "15000.5",
        expenseDateMatchesPage(expenseDate),
        "Tanque de gas",
      ]),
    );
  });

  it("uses an empty property cell for property-less gastos and empty description", () => {
    const csv = buildExpensesCsv([
      buildExpense({
        property: null,
        propertyId: null,
        description: null,
        expenseType: { id: "type-2", name: "Limpieza" },
      }) as never,
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1]).toBe(
      expectedRow([
        "expense-1",
        "Limpieza",
        "",
        "Servicios",
        "15000.5",
        expenseDateMatchesPage(expenseDate),
        "",
      ]),
    );
  });

  it("quotes descriptions containing commas and doubles inner quotes", () => {
    const csv = buildExpensesCsv([
      buildExpense({ description: 'Gas, "tanque cargado"' }) as never,
    ]);
    const lines = csv.slice("\uFEFF".length).split("\r\n");

    expect(lines[1].endsWith('"Gas, ""tanque cargado"""')).toBe(true);
  });
});

describe("buildBackupCsvs", () => {
  it("loads from prisma with the expected ordering and returns counts", async () => {
    mocks.guestFindMany.mockResolvedValue([
      buildGuest(),
      buildGuest({ id: "g2" }),
    ]);
    mocks.bookingFindMany.mockResolvedValue([buildBooking()]);
    mocks.expenseFindMany.mockResolvedValue([buildExpense()]);

    const result = await buildBackupCsvs();

    expect(mocks.guestFindMany).toHaveBeenCalledWith({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    expect(mocks.bookingFindMany).toHaveBeenCalledWith({
      include: {
        property: true,
        guest: true,
        depositTransferRecipient: true,
        restTransferRecipient: true,
      },
      orderBy: { checkIn: "asc" },
    });
    expect(mocks.expenseFindMany).toHaveBeenCalledWith({
      include: { property: true, expenseType: true },
      orderBy: { date: "desc" },
    });
    expect(result.guestCount).toBe(2);
    expect(result.bookingCount).toBe(1);
    expect(result.expenseCount).toBe(1);
    expect(result.guests.startsWith("\uFEFF")).toBe(true);
    expect(result.bookings.startsWith("\uFEFF")).toBe(true);
    expect(result.expenses.startsWith("\uFEFF")).toBe(true);
  });
});
