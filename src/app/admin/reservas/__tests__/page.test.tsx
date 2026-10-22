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
  depositTransferRecipient: null,
  restTransferRecipient: null,
  guest: { id: "g-1", firstName: "Juan", lastName: "Pérez", dni: "32456778" },
  checkIn: new Date("2026-10-10T12:00:00-03:00"),
  checkOut: new Date("2026-10-13T10:00:00-03:00"),
  pricePerNight: 150,
  depositAmount: 100,
  depositPaymentType: "EFECTIVO" as const,
  restPaymentType: "EFECTIVO" as const,
};

const sampleTransferBooking = {
  ...sampleBooking,
  id: "b-2",
  propertyId: "p-casita",
  property: { id: "p-casita", title: "Casita" },
  depositTransferRecipient: { id: "r-1", name: "Sonia" },
  guest: { id: "g-2", firstName: "María", lastName: "López", dni: "12345678" },
  depositPaymentType: "TRANSFERENCIA" as const,
  restPaymentType: "TRANSFERENCIA" as const,
  restTransferRecipient: { id: "r-2", name: "Pablo" },
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
    mocks.bookingFindMany.mockResolvedValue([
      sampleBooking,
      sampleTransferBooking,
    ]);
  });

  it("reservas list rows render guest firstName lastName and dni", async () => {
    render(await ReservasPage({ searchParams: {} }));

    expect(mocks.bookingFindMany).toHaveBeenCalledWith({
      where: undefined,
      include: {
        property: true,
        depositTransferRecipient: true,
        restTransferRecipient: true,
        guest: true,
      },
      orderBy: { checkIn: "desc" },
    });
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("32456778")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    // "Depto 1" appears in the table cell and in the filter's <option>.
    expect(screen.getAllByText("Depto 1")).toHaveLength(2);
    // Each payment group shows its own type + destinatario.
    expect(screen.getByText("Transferencia · Sonia")).toBeInTheDocument();
    expect(screen.getByText("Transferencia · Pablo")).toBeInTheDocument();
    // The efectivo booking shows "Efectivo" in both payment cells.
    expect(screen.getAllByText("Efectivo")).toHaveLength(2);
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
      include: {
        property: true,
        depositTransferRecipient: true,
        restTransferRecipient: true,
        guest: true,
      },
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

  it("reservas search 'perez' matches the guest via normalizeForSearch in TypeScript (no DB OR filter)", async () => {
    render(await ReservasPage({ searchParams: { q: "perez" } }));

    // The text query never reaches the database: structured filters only.
    const call = mocks.bookingFindMany.mock.calls[0][0];
    expect(call.where).toBeUndefined();

    // The in-memory filter matches the accented "Pérez" from "perez" and
    // discards the non-matching booking.
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("reservas search by dni fragment matches through the guest fields", async () => {
    render(await ReservasPage({ searchParams: { q: "32456" } }));

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("ignore invalid date strings instead of erroring", async () => {
    render(
      await ReservasPage({ searchParams: { desde: "no-es-fecha" } }),
    );

    const call = mocks.bookingFindMany.mock.calls[0][0];
    expect(call.where).toBeUndefined();
  });

  it("edit links unchanged: each booking links to its agenda edit view", async () => {
    render(await ReservasPage({ searchParams: {} }));

    expect(
      screen.getAllByRole("link", { name: /editar/i })[0],
    ).toHaveAttribute(
      "href",
      `/admin/reservas/nueva?reserva=${sampleBooking.id}`,
    );
  });
});
