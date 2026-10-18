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
import { toDateStr } from "@/lib/datetime";

interface AgendaBookingLike {
  id: string;
  propertyId: string;
  guest: { id: string; firstName: string; lastName: string };
  checkIn: Date;
  checkOut: Date;
  pricePerNight: unknown;
  depositAmount: unknown;
  depositPaymentType: "EFECTIVO" | "TRANSFERENCIA";
  depositPaymentMethod: string | null;
  depositTransferRecipientId: string | null;
  restPaymentType: "EFECTIVO" | "TRANSFERENCIA";
  restTransferRecipientId: string | null;
  notes: string | null;
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
    depositPaymentType: "EFECTIVO",
    depositPaymentMethod: null,
    depositTransferRecipientId: null,
    restPaymentType: "EFECTIVO",
    restTransferRecipientId: null,
    notes: null,
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

  it("lists every booking of the property without the monthly calendar grid", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: {},
      }),
    );

    // The monthly grid lives in the Calendario tab; the agenda has no grid.
    expect(document.querySelector('[role="grid"]')).toBeNull();

    // The complete booking list of the property renders.
    expect(
      screen.getByText(/reservas de la propiedad/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Juan Pérez · \$/)).toBeInTheDocument();
  });

  it("shows back-to-back stays together in the property list", async () => {
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
        searchParams: {},
      }),
    );

    expect(screen.getByText(/Juan Pérez · \$/)).toBeInTheDocument();
    expect(screen.getByText(/María López · \$/)).toBeInTheDocument();
  });

  it("queries ALL the property's bookings including the guest, newest first", async () => {
    await render(
      await AgendaPage({
        params: { id: "p-depto-1" },
        searchParams: {},
      }),
    );

    const call = mocks.findBookings.mock.calls[0][0];
    expect(call.where).toEqual({ propertyId: "p-depto-1" });
    expect(call.orderBy).toEqual({ checkIn: "desc" });
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
