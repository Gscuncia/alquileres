import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  findProperty: vi.fn(),
  findBookings: vi.fn(),
  findBooking: vi.fn(),
  findRecipients: vi.fn(),
  findGuests: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    property: { findUnique: mocks.findProperty },
    booking: {
      findMany: mocks.findBookings,
      findUnique: mocks.findBooking,
    },
    transferRecipient: { findMany: mocks.findRecipients },
    guest: { findMany: mocks.findGuests },
  },
}));

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does); BookingForm needs it, so tests stub it like property-form's.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

import AgendaPage from "@/app/admin/propiedades/[id]/agenda/page";
import { formatInTz, toUtc, toDateStr } from "@/lib/datetime";

interface AgendaBookingLike {
  id: string;
  propertyId: string;
  guest: { id: string; firstName: string; lastName: string };
  checkIn: Date;
  checkOut: Date;
  pricePerNight: unknown;
  depositAmount: unknown;
  paymentType: "EFECTIVO" | "TRANSFERENCIA";
  paymentMethod: string | null;
  notes: string | null;
  transferRecipientId: string | null;
}

function booking(overrides: Partial<AgendaBookingLike>): AgendaBookingLike {
  return {
    id: "b-1",
    propertyId: "p-depto-1",
    guest: { id: "g-1", firstName: "Juan", lastName: "Pérez" },
    checkIn: new Date("2026-10-10T12:00:00-03:00"),
    checkOut: new Date("2026-10-13T10:00:00-03:00"),
    pricePerNight: 150,
    depositAmount: 0,
    paymentType: "EFECTIVO",
    paymentMethod: null,
    notes: null,
    transferRecipientId: null,
    ...overrides,
  };
}

describe("AgendaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", role: "ADMIN" },
    });
    mocks.findProperty.mockResolvedValue({
      id: "p-depto-1",
      title: "Depto 1",
    });
    mocks.findBooking.mockResolvedValue(null);
    mocks.findRecipients.mockResolvedValue([
      { id: "r-1", name: "Sonia" },
    ]);
    mocks.findGuests.mockResolvedValue([
      { id: "g-1", firstName: "Juan", lastName: "Pérez", dni: "32456778", phone: "2231555555" },
    ]);
    mocks.findBookings.mockResolvedValue([booking({})]);
  });

  it("swaps to single-mode CalendarGrid: stay chips + covered days + month list", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    // Arrow chips on the check-in / check-out BA days.
    expect(screen.getByText(/→ 12:00 Juan/)).toBeInTheDocument();
    expect(screen.getByText(/← 10:00 Juan/)).toBeInTheDocument();

    // The month booking list (showMonthList) shows the stay with its window.
    expect(
      screen.getByText(
        `Juan Pérez — ${formatInTz(booking({}).checkIn)} → ${formatInTz(booking({}).checkOut)}`,
      ),
    ).toBeInTheDocument();
  });

  it("agenda chip opens booking edit via chipHref keeping the agenda ?reserva= target", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    expect(
      screen.getByText(/→ 12:00 Juan/).closest("a"),
    ).toHaveAttribute(
      "href",
      "/admin/propiedades/p-depto-1/agenda?mes=2026-10&reserva=b-1",
    );
  });

  it("agenda day link targets dayHref with fecha prefill", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    expect(screen.getByText("10").closest("a")).toHaveAttribute(
      "href",
      "/admin/propiedades/p-depto-1/agenda?fecha=2026-10-10",
    );
  });

  it("highlights covered calendar days with the single-mode accent ring", async () => {
    const { container } = await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    // Stay Oct 10 12:00 → Oct 13 10:00 covers Oct 10..12 (half-open).
    // Oct 1 2026 is a Thursday → Monday-first leading blanks = 3.
    const grid = container.querySelector('[role="grid"]') as HTMLElement;
    const cellOf = (day: number): HTMLElement =>
      grid.children[7 + 3 + day - 1] as HTMLElement;

    expect(cellOf(10).className).toContain("ring-sky");
    expect(cellOf(11).className).toContain("ring-sky");
    expect(cellOf(12).className).toContain("ring-sky");
    expect(cellOf(9).className).not.toContain("ring-sky");
  });

  it("shows back-to-back stays together without a conflict indication", async () => {
    const stayA = booking({ id: "b-a", checkOut: new Date("2026-10-13T10:00:00-03:00") });
    const stayB = booking({
      id: "b-b",
      guest: { id: "g-2", firstName: "María", lastName: "López" },
      checkIn: new Date("2026-10-13T12:00:00-03:00"),
    });
    mocks.findBookings.mockResolvedValue([stayA, stayB]);

    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    // Both stays are listed (calendar entries included); the calendar has no
    // conflict state to signal — back-to-back is treated like any other stay.
    expect(screen.getByText(/Juan Pérez · \$/)).toBeInTheDocument();
    expect(screen.getByText(/María López · \$/)).toBeInTheDocument();
  });

  it("queries the property's bookings for the requested month window including the guest", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { mes: "2026-10" },
      }),
    );

    const call = mocks.findBookings.mock.calls[0][0];
    expect(call.where.propertyId).toBe("p-depto-1");
    expect(call.where.checkIn.lt.toISOString()).toBe(
      toUtc("2026-11-01", "00:00").toISOString(),
    );
    expect(call.where.checkOut.gt.toISOString()).toBe(
      toUtc("2026-10-01", "00:00").toISOString(),
    );
    expect(call.include).toEqual({ guest: true });
  });

  it("agenda page prefills fecha when ?fecha given (default times 12:00 / 10:00)", async () => {
    render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: { fecha: "2026-10-15" },
      }),
    );

    expect(screen.getByLabelText("Fecha de ingreso")).toHaveValue("2026-10-15");
    expect(screen.getByLabelText("Hora de ingreso")).toHaveValue("12:00");
    expect(screen.getByLabelText("Hora de egreso")).toHaveValue("10:00");
  });

  it("agenda defaults checkInDate to today without fecha", async () => {
    render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: {},
      }),
    );

    expect(screen.getByLabelText("Fecha de ingreso")).toHaveValue(
      toDateStr(new Date()),
    );
    expect(screen.getByLabelText("Fecha de egreso")).toHaveValue("");
  });
});
