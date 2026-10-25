import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  findBookings: vi.fn(),
  findBooking: vi.fn(),
  findRecipients: vi.fn(),
  findGuests: vi.fn(),
  findHolidays: vi.fn(),
  getProperties: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: mocks.findBookings,
      findUnique: mocks.findBooking,
    },
    transferRecipient: { findMany: mocks.findRecipients },
    guest: { findMany: mocks.findGuests },
    holiday: { findMany: mocks.findHolidays },
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does); BookingForm needs it, so tests stub it like agenda's.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

import CalendarioPage from "@/app/admin/calendario/page";
import { toUtc, toDateStr } from "@/lib/datetime";

interface CalendarioBookingLike {
  id: string;
  propertyId: string;
  guest: { id: string; firstName: string; lastName: string };
  property: { id: string; title: string };
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

function booking(overrides: Partial<CalendarioBookingLike>): CalendarioBookingLike {
  return {
    id: "b-1",
    propertyId: "p-1",
    guest: { id: "g-1", firstName: "Juan", lastName: "Pérez" },
    property: { id: "p-1", title: "Depto 1" },
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

const properties = [
  { id: "p-1", title: "Depto 1", slug: "depto-1", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 2, bedrooms: 1, bathrooms: 1, published: true, sortOrder: 1 },
  { id: "p-2", title: "Casita", slug: "casita", shortDescription: "", location: "", images: [], description: "", amenities: [], capacity: 4, bedrooms: 2, bathrooms: 1, published: true, sortOrder: 2 },
];

function bootstrap() {
  mocks.requireAdmin.mockResolvedValue({
    user: { id: "user-1", role: "ADMIN" },
  });
  mocks.getProperties.mockResolvedValue(properties);
  mocks.findBooking.mockResolvedValue(null);
  mocks.findRecipients.mockResolvedValue([{ id: "r-1", name: "Sonia" }]);
  mocks.findGuests.mockResolvedValue([
    { id: "g-1", firstName: "Juan", lastName: "Pérez", dni: "32456778", phone: "2231555555" },
  ]);
  mocks.findBookings.mockResolvedValue([booking({})]);
  mocks.findHolidays.mockResolvedValue([]);
}

describe("CalendarioPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bootstrap();
  });

  it("validates mes: an invalid mes falls back to the current month window", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "20-24" },
      }),
    );

    const call = mocks.findBookings.mock.calls[0][0];
    const year = Number(toDateStr(new Date()).slice(0, 4));
    const month = Number(toDateStr(new Date()).slice(5, 7));
    const firstNext = new Date(year, month, 1);
    expect(call.where.checkIn.lt.toISOString()).toBe(
      toUtc(
        `${firstNext.getFullYear()}-${String(firstNext.getMonth() + 1).padStart(2, "0")}-01`,
        "00:00",
      ).toISOString(),
    );
  });

  it("validates propiedad: an unknown id falls back to 'todas' (no propertyId filter)", async () => {
    await render(
      await CalendarioPage({
        searchParams: { propiedad: "desconocida" },
      }),
    );

    const call = mocks.findBookings.mock.calls[0][0];
    expect(call.where.propertyId).toBeUndefined();
  });

  it("mode switching: specific propiedad fetches that property and renders single mode", async () => {
    const { container } = await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", propiedad: "p-1" },
      }),
    );

    expect(mocks.findBookings).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ propertyId: "p-1" }),
      }),
    );
    // Single mode: propiedades select shows the filter; no legend row.
    expect(
      screen.queryByLabelText(/leyenda de colores por propiedad/i),
    ).toBeNull();
    const grid = container.querySelector('[role="grid"]');
    expect(grid).not.toBeNull();
  });

  it("mode switching: without propiedad the grid renders 'todas' with the color legend", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10" },
      }),
    );

    expect(screen.getByLabelText(/leyenda de colores por propiedad/i)).toBeInTheDocument();
  });

  it("month nav links preserve the propiedad filter", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", propiedad: "p-1" },
      }),
    );

    const prev = screen.getByText(/mes anterior/i).closest("a");
    const next = screen.getByText(/mes siguiente/i).closest("a");
    expect(prev).toHaveAttribute(
      "href",
      "/admin/calendario?mes=2026-09&propiedad=p-1",
    );
    expect(next).toHaveAttribute(
      "href",
      "/admin/calendario?mes=2026-11&propiedad=p-1",
    );
  });

  it("chip links target the property agenda edit route", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10" },
      }),
    );

    // Both arrow chips (check-in / check-out) of booking b-1 target its
    // property agenda edit route.
    const chipLinks = screen
      .getAllByText(/Juan/)
      .map((node) => node.closest("a")?.getAttribute("href"));
    expect(chipLinks).toEqual([
      "/admin/reservas/nueva?reserva=b-1",
      "/admin/reservas/nueva?reserva=b-1",
    ]);
  });

  it("day links start a create form on that day preserving the filter", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", propiedad: "p-1" },
      }),
    );

    expect(screen.getByText("10").closest("a")).toHaveAttribute(
      "href",
      "/admin/calendario?nueva=1&fecha=2026-10-10&propiedad=p-1",
    );
  });

  it("nueva/fecha renders the create form prefilled with the day, default times, and preselected property", async () => {
    cleanup();
    await render(
      await CalendarioPage({
        searchParams: { nueva: "1", fecha: "2026-10-10", propiedad: "p-1" },
      }),
    );

    expect(screen.getByText("Nueva reserva")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de ingreso")).toHaveValue("2026-10-10");
    expect(screen.getByLabelText("Hora de ingreso")).toHaveValue("12:00");
    expect(screen.getByLabelText("Hora de egreso")).toHaveValue("10:00");
    // The form's property select (id propertyId) is distinct from the page
    // filter select (id propiedad); both are labeled "Propiedad".
    const formSelect = screen.getAllByLabelText("Propiedad").find(
      (node) => node.id === "propertyId",
    ) as HTMLSelectElement;
    expect(formSelect).toBeDefined();
    expect(formSelect).toHaveValue("p-1");
  });

  it("under 'todas' the create form's property select is empty and required", async () => {
    cleanup();
    await render(
      await CalendarioPage({
        searchParams: { nueva: "1" },
      }),
    );

    expect(screen.getByText("Nueva reserva")).toBeInTheDocument();
    const formSelect = screen.getAllByLabelText("Propiedad").find(
      (node) => node.id === "propertyId",
    ) as HTMLSelectElement;
    expect(formSelect).toHaveValue("");
    expect(formSelect).toHaveAttribute("required");
  });

  it("?dia renders the DayDetailList with edit links", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", dia: "2026-10-10" },
      }),
    );

    expect(screen.getByText(/Juan Pérez —/)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: "Editar" })[0].closest("a"),
    ).toHaveAttribute("href", "/admin/reservas/nueva?reserva=b-1");
  });

  it("?reserva renders the edit form for an existing filtered booking", async () => {
    mocks.findBooking.mockResolvedValue(booking({}));

    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", propiedad: "p-1", reserva: "b-1" },
      }),
    );

    expect(screen.getByText("Editar reserva")).toBeInTheDocument();
    expect(screen.getByText("Cancelar edición")).toBeInTheDocument();
  });

  it("guard: a booking outside the filtered property falls back to the create form", async () => {
    mocks.findBooking.mockResolvedValue(booking({ propertyId: "p-2", property: { id: "p-2", title: "Casita" } }));

    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10", propiedad: "p-1", reserva: "b-otra" },
      }),
    );

    expect(screen.queryByText("Editar reserva")).not.toBeInTheDocument();
  });

  it("queries the month window with overlap and includes guest + property", async () => {
    await render(
      await CalendarioPage({
        searchParams: { mes: "2026-10" },
      }),
    );

    const call = mocks.findBookings.mock.calls[0][0];
    expect(call.where.checkIn.lt.toISOString()).toBe(
      toUtc("2026-11-01", "00:00").toISOString(),
    );
    expect(call.where.checkOut.gt.toISOString()).toBe(
      toUtc("2026-10-01", "00:00").toISOString(),
    );
    expect(call.include).toEqual({
      guest: true,
      property: { select: { id: true, title: true } },
    });
  });
});
