import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  bookingFindMany: vi.fn(),
  requireAdmin: vi.fn(),
  getProperties: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: mocks.bookingFindMany,
    },
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

import ReservasPage from "@/app/admin/reservas/page";
import { toUtc } from "@/lib/datetime";

const sampleBooking = {
  id: "b-1",
  propertyId: "p-depto-1",
  property: { id: "p-depto-1", title: "Depto 1" },
  transferRecipient: null,
  firstName: "Juan",
  lastName: "Pérez",
  dni: "32456778",
  checkIn: new Date("2026-10-10T12:00:00-03:00"),
  checkOut: new Date("2026-10-13T10:00:00-03:00"),
  pricePerNight: 150,
  paymentType: "EFECTIVO" as const,
};

const sampleTransferBooking = {
  ...sampleBooking,
  id: "b-2",
  propertyId: "p-casita",
  property: { id: "p-casita", title: "Casita" },
  transferRecipient: { id: "r-1", name: "Sonia" },
  firstName: "María",
  lastName: "López",
  dni: "12345678",
  paymentType: "TRANSFERENCIA" as const,
};

describe("ReservasPage filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.getProperties.mockResolvedValue([
      { id: "p-depto-1", title: "Depto 1" },
      { id: "p-casita", title: "Casita" },
    ]);
    mocks.bookingFindMany.mockResolvedValue([sampleBooking, sampleTransferBooking]);
  });

  it("lists all bookings without a where clause when no filters are applied", async () => {
    render(await ReservasPage({ searchParams: {} }));

    expect(mocks.bookingFindMany).toHaveBeenCalledWith({
      where: undefined,
      include: { property: true, transferRecipient: true },
      orderBy: { checkIn: "desc" },
    });
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    // "Depto 1" appears in the table cell and in the filter's <option>.
    expect(screen.getAllByText("Depto 1")).toHaveLength(2);
    // Transferencia shows its destinatario; efectivo does not.
    expect(screen.getByText("Transferencia · Sonia")).toBeInTheDocument();
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
  });

  it("shows the empty state when filters return nothing", async () => {
    mocks.bookingFindMany.mockResolvedValue([]);

    render(
      await ReservasPage({ searchParams: { q: "inexistente" } }),
    );

    expect(screen.getByText(/no hay reservas que coincidan/i)).toBeInTheDocument();
  });

  it("filters by property", async () => {
    render(await ReservasPage({ searchParams: { propiedad: "p-depto-1" } }));

    expect(mocks.bookingFindMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ propertyId: "p-depto-1" }),
      include: { property: true, transferRecipient: true },
      orderBy: { checkIn: "desc" },
    });
  });

  it("filters by an inclusive date range on the check-in instant", async () => {
    render(
      await ReservasPage({
        searchParams: { desde: "2026-10-01", hasta: "2026-10-31" },
      }),
    );

    const call = mocks.bookingFindMany.mock.calls[0][0];
    const where = call.where as {
      checkIn?: { gte: Date; lt: Date };
    };
    expect(where.checkIn?.gte.toISOString()).toBe(
      toUtc("2026-10-01", "00:00").toISOString(),
    );
    // Exclusive upper bound: the day AFTER the selected hasta date.
    expect(where.checkIn?.lt.toISOString()).toBe(
      toUtc("2026-11-01", "00:00").toISOString(),
    );
  });

  it("searches client name and DNI case-insensitively ('perez' finds 'Pérez')", async () => {
    render(await ReservasPage({ searchParams: { q: "perez" } }));

    expect(mocks.bookingFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { firstName: { contains: "perez", mode: "insensitive" } },
          { lastName: { contains: "perez", mode: "insensitive" } },
          { dni: { contains: "perez", mode: "insensitive" } },
        ],
      },
      include: { property: true, transferRecipient: true },
      orderBy: { checkIn: "desc" },
    });
  });

  it("ignores invalid date strings instead of erroring", async () => {
    render(
      await ReservasPage({ searchParams: { desde: "no-es-fecha" } }),
    );

    const call = mocks.bookingFindMany.mock.calls[0][0];
    expect(call.where).toBeUndefined();
  });

  it("links each booking to its agenda edit view", async () => {
    render(await ReservasPage({ searchParams: {} }));

    expect(
      screen.getAllByRole("link", { name: /editar/i })[0],
    ).toHaveAttribute(
      "href",
      `/admin/propiedades/${sampleBooking.propertyId}/agenda?reserva=${sampleBooking.id}`,
    );
  });
});
