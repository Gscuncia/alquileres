import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does); BookingForm needs it, so tests stub it like the page tests.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

const mocks = vi.hoisted(() => ({
  findProperties: vi.fn(),
  findRecipients: vi.fn(),
  findGuests: vi.fn(),
  findBookings: vi.fn(),
  findBooking: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    property: { findMany: mocks.findProperties },
    transferRecipient: { findMany: mocks.findRecipients },
    guest: { findMany: mocks.findGuests },
    booking: {
      findMany: mocks.findBookings,
      findUnique: mocks.findBooking,
    },
  },
}));

vi.mock("@/app/admin/bookings/actions", () => ({
  createBooking: vi.fn(),
  updateBooking: vi.fn(),
}));

import NuevaReservaPage from "@/app/admin/reservas/nueva/page";
import { toDateStr } from "@/lib/datetime";

const editingBooking = {
  id: "b-1",
  propertyId: "p-1",
  guest: { id: "g-1" },
  checkIn: new Date("2026-10-18T15:00:00.000Z"),
  checkOut: new Date("2026-10-20T13:00:00.000Z"),
  pricePerNight: { toString: () => "5000" },
  depositAmount: { toString: () => "1500" },
  depositPaymentType: "TRANSFERENCIA" as const,
  depositPaymentMethod: null,
  depositTransferRecipientId: "r-1",
  restPaymentType: "EFECTIVO" as const,
  restTransferRecipientId: null,
  notes: "notas",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findProperties.mockResolvedValue([
    { id: "p-1", title: "Depto 1" },
    { id: "p-2", title: "Casita" },
  ]);
  mocks.findRecipients.mockResolvedValue([{ id: "r-1", name: "Sonia" }]);
  mocks.findGuests.mockResolvedValue([
    { id: "g-1", firstName: "Guillermo", lastName: "Scuncia", dni: "35172650", phone: "1155052228" },
  ]);
  mocks.findBookings.mockResolvedValue([
    {
      id: "b-2",
      propertyId: "p-2",
      checkIn: new Date("2026-10-21T15:00:00.000Z"),
      checkOut: new Date("2026-10-23T13:00:00.000Z"),
      guest: { firstName: "Rocio", lastName: "Santillan" },
    },
  ]);
  mocks.findBooking.mockResolvedValue(null);
});

describe("NuevaReservaPage", () => {
  it("renders the creation form with property, guests and recipients", async () => {
    render(await NuevaReservaPage({ searchParams: {} }));

    expect(screen.getByText("Nueva reserva")).toBeInTheDocument();
    expect(screen.getByLabelText("Propiedad")).toBeInTheDocument();
    // Availability alert data is wired (the other stay is loaded).
    expect(screen.queryByText(/reservado por Rocio/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /crear reserva/i }),
    ).toBeEnabled();
  });

  it("prefills the create form with today's check-in and default times", async () => {
    render(await NuevaReservaPage({ searchParams: {} }));

    expect(screen.getByLabelText("Fecha de ingreso")).toHaveValue(toDateStr(new Date()));
    expect(screen.getByLabelText("Hora de ingreso")).toHaveValue("12:00");
    expect(screen.getByLabelText("Hora de egreso")).toHaveValue("10:00");
  });

  it("edit mode loads the booking with its property selectable", async () => {
    mocks.findBooking.mockResolvedValue(editingBooking);

    render(await NuevaReservaPage({ searchParams: { reserva: "b-1" } }));

    expect(screen.getByText("Editar reserva")).toBeInTheDocument();
    expect(screen.getByLabelText("Propiedad")).toHaveValue("p-1");
    expect(screen.getByLabelText("Fecha de ingreso")).toHaveValue("2026-10-18");
    expect(screen.getByLabelText("Seña")).toHaveValue(1500);
    expect(
      screen.getByRole("button", { name: /guardar cambios/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("link", { name: /cancelar edición/i }),
    ).toHaveAttribute("href", "/admin/reservas/nueva");
  });

  it("edit mode with an unknown booking id falls back to creation", async () => {
    render(await NuevaReservaPage({ searchParams: { reserva: "no-existe" } }));

    expect(screen.getByText("Nueva reserva")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /crear reserva/i })).toBeInTheDocument();
  });
});
