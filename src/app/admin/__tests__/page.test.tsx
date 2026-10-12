import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  bookingFindMany: vi.fn(),
  expenseFindMany: vi.fn(),
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
    expense: {
      findMany: mocks.expenseFindMany,
    },
  },
}));

vi.mock("@/lib/properties-db", () => ({
  getAllPropertiesForAdmin: () => mocks.getProperties(),
}));

import AdminDashboardPage from "@/app/admin/page";
import { toDateStr, toUtc } from "@/lib/datetime";

const properties = [
  { id: "p-1", title: "Depto 1", slug: "depto-1" },
  { id: "p-2", title: "Casita", slug: "casita" },
];

/** Period Oct 1–11: 10 nights. Depto 1: 4 nights × $90 = $360 (40%).
 * Casita: 6 nights × $100 = $600 (60%). Deposits 50 + 20 = $70 pending. */
const periodBookings = [
  {
    id: "b-1",
    propertyId: "p-1",
    firstName: "Laura",
    lastName: "Gómez",
    checkIn: toUtc("2026-09-30", "18:00"),
    checkOut: toUtc("2026-10-05", "10:00"),
    pricePerNight: 90,
    depositAmount: 50,
    settledAt: null,
  },
  {
    id: "b-2",
    propertyId: "p-2",
    firstName: "Diego",
    lastName: "Fernández",
    checkIn: toUtc("2026-10-02", "14:00"),
    checkOut: toUtc("2026-10-08", "10:00"),
    pricePerNight: 100,
    depositAmount: 20,
    settledAt: null,
  },
];

const periodExpenses = [
  {
    id: "e-1",
    propertyId: "p-1",
    type: "MANTENIMIENTO" as const,
    category: "Plomería",
    description: null,
    amount: 120,
    date: toUtc("2026-10-03", "00:00"),
  },
  {
    id: "e-2",
    propertyId: null,
    type: "CONSORCIO" as const,
    category: "Expensas",
    description: null,
    amount: 80,
    date: toUtc("2026-10-04", "00:00"),
  },
];

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.getProperties.mockResolvedValue(properties);
  });

  it("defaults the period to the current BA calendar month when no searchParams are given", async () => {
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.expenseFindMany.mockResolvedValue([]);

    await AdminDashboardPage({ searchParams: {} });

    const todayStr = toDateStr(new Date());
    const currentMonthStart = `${todayStr.slice(0, 7)}-01`;
    const monthEnd = toUtc(
      (() => {
        const [year, month] = currentMonthStart
          .slice(0, 7)
          .split("-")
          .map(Number);
        const next = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return `${nextYear}-${String(next).padStart(2, "0")}-01`;
      })(),
      "00:00",
    );

    // First booking.findMany call = the selected-period window.
    const periodCall = mocks.bookingFindMany.mock.calls[0][0];
    expect(periodCall.where.checkOut.gt.toISOString()).toBe(
      toUtc(currentMonthStart, "00:00").toISOString(),
    );
    expect(periodCall.where.checkIn.lt.toISOString()).toBe(
      monthEnd.toISOString(),
    );

    // Expenses in the same window.
    const expenseCall = mocks.expenseFindMany.mock.calls[0][0];
    expect(expenseCall.where.date.gte.toISOString()).toBe(
      toUtc(currentMonthStart, "00:00").toISOString(),
    );
    expect(expenseCall.where.date.lt.toISOString()).toBe(
      monthEnd.toISOString(),
    );
  });

  it("renders revenue, occupancy, pending deposits and expenses vs revenue for the selected period", async () => {
    // Booking windows in call order: 1) period, 2) moves, 3) trend.
    mocks.bookingFindMany
      .mockResolvedValueOnce(periodBookings)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.expenseFindMany.mockResolvedValue(periodExpenses);

    render(
      await AdminDashboardPage({
        searchParams: { from: "2026-10-01", to: "2026-10-11" },
      }),
    );

    // Period window uses the exact [from, to) instants.
    const call = mocks.bookingFindMany.mock.calls[0][0];
    expect(call.where.checkOut.gt.toISOString()).toBe(
      toUtc("2026-10-01", "00:00").toISOString(),
    );
    expect(call.where.checkIn.lt.toISOString()).toBe(
      toUtc("2026-10-11", "00:00").toISOString(),
    );

    // Revenue per property: $360 and $600.
    expect(screen.getByText(/^\$\s*360,00$/)).toBeInTheDocument();
    expect(screen.getByText(/^\$\s*600,00$/)).toBeInTheDocument();
    // A revenue cell for the property table (Depto 1 row).
    const deptoRow = screen.getByText("Depto 1").closest("tr");
    expect(deptoRow).toHaveTextContent("360");
    const casitaRow = screen.getByText("Casita").closest("tr");
    expect(casitaRow).toHaveTextContent("600");

    // Occupancy: 4/10 and 6/10.
    expect(deptoRow).toHaveTextContent("40%");
    expect(casitaRow).toHaveTextContent("60%");

    // Pending deposits: 50 + 20 = $70 (settled ones excluded is asserted at
    // unit level; both fixtures are unsettled here).
    expect(screen.getByText(/^\$\s*70,00$/)).toBeInTheDocument();

    // Expenses vs revenue for the period: 200 expenses, 960 revenue, 760 net.
    // Total revenue appears in both the "Ingresos del período" card and the
    // "Gastos vs ingresos" panel.
    expect(screen.getAllByText(/^\$\s*960,00$/)).toHaveLength(2);
    expect(screen.getByText(/^\$\s*200,00$/)).toBeInTheDocument();
    expect(screen.getByText(/Resultado:\s*\$\s*760,00/)).toBeInTheDocument();

    // Period selector: two date inputs, Aplicar button, and Mes actual preset.
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-10-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-10-11");
    expect(screen.getByRole("button", { name: "Aplicar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mes actual" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("shows upcoming check-ins and check-outs for the next 14 days only", async () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const in20Days = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const movesBookings = [
      {
        // Check-in in the window, check-out far beyond it → only checkIns.
        id: "b-m1",
        propertyId: "p-1",
        firstName: "Homero",
        lastName: "Próximo",
        checkIn: tomorrow,
        checkOut: in20Days,
        pricePerNight: 100,
        depositAmount: 0,
        settledAt: null,
      },
      {
        // Check-out in the window, check-in already past → only checkOuts.
        id: "b-m2",
        propertyId: "p-2",
        firstName: "Saliente",
        lastName: "Visitante",
        checkIn: fiveDaysAgo,
        checkOut: tomorrow,
        pricePerNight: 100,
        depositAmount: 0,
        settledAt: null,
      },
      {
        // 20 days out → excluded entirely.
        id: "b-m3",
        propertyId: "p-2",
        firstName: "Lejana",
        lastName: "Reserva",
        checkIn: in20Days,
        checkOut: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        pricePerNight: 100,
        depositAmount: 0,
        settledAt: null,
      },
    ];

    // Booking windows: period → []; moves → movesBookings; trend → [].
    let callIndex = 0;
    mocks.bookingFindMany.mockImplementation(() => {
      callIndex += 1;
      return Promise.resolve(callIndex === 2 ? movesBookings : []);
    });
    mocks.expenseFindMany.mockResolvedValue([]);

    render(await AdminDashboardPage({ searchParams: {} }));

    expect(screen.getByText(/Homero Próximo/)).toBeInTheDocument();
    expect(screen.getByText(/Saliente Visitante/)).toBeInTheDocument();
    expect(screen.queryByText(/Lejana Reserva/)).not.toBeInTheDocument();
  });

  it("shows the monthly trend with 6 monthly points", async () => {
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.expenseFindMany.mockResolvedValue([]);

    render(await AdminDashboardPage({ searchParams: {} }));

    // Six label rows like "octubre de 2026" (one per month).
    const monthLabels = screen.getAllByText(/ de 20\d\d/);
    expect(monthLabels).toHaveLength(6);
  });

  it("shows zero revenue (never an error) for a period with no bookings", async () => {
    mocks.bookingFindMany.mockResolvedValue([]);
    mocks.expenseFindMany.mockResolvedValue([]);

    render(
      await AdminDashboardPage({
        searchParams: { from: "2026-01-01", to: "2026-01-11" },
      }),
    );

    const deptoRow = screen.getByText("Depto 1").closest("tr");
    expect(deptoRow).toHaveTextContent("0%");
    expect(deptoRow).toHaveTextContent(/0,00/);
  });

  it("recomputes figures when the period changes", async () => {
    mocks.bookingFindMany
      .mockResolvedValueOnce(periodBookings)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.expenseFindMany
      .mockResolvedValueOnce(periodExpenses)
      .mockResolvedValueOnce([]);

    render(
      await AdminDashboardPage({
        searchParams: { from: "2026-10-01", to: "2026-10-11" },
      }),
    );
    expect(screen.getByText(/^\$\s*360,00$/)).toBeInTheDocument();

    // The next render replaces the first one in the DOM.
    cleanup();

    mocks.bookingFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mocks.expenseFindMany.mockResolvedValueOnce([]);

    render(
      await AdminDashboardPage({
        searchParams: { from: "2026-11-01", to: "2026-12-01" },
      }),
    );

    // 3 booking calls per render: the 4th call is the NEW period query.
    const call = mocks.bookingFindMany.mock.calls[3][0];
    expect(call.where.checkOut.gt.toISOString()).toBe(
      toUtc("2026-11-01", "00:00").toISOString(),
    );
    expect(call.where.checkIn.lt.toISOString()).toBe(
      toUtc("2026-12-01", "00:00").toISOString(),
    );
    // November has no bookings in the fixtures → the October figure is gone.
    expect(screen.queryByText(/^\$\s*360,00$/)).not.toBeInTheDocument();
  });
});
