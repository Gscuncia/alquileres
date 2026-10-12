import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  guestFindMany: vi.fn(),
  guestFindUnique: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mocks.requireAdmin(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    guest: {
      findMany: mocks.guestFindMany,
      findUnique: mocks.guestFindUnique,
    },
  },
}));

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does); GuestForm needs it, so tests stub it like property-form's.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

import HuespedesPage from "@/app/admin/huespedes/page";

const sampleGuests = [
  {
    id: "g-1",
    firstName: "Juan",
    lastName: "Pérez",
    dni: "30123456",
    phone: "1551234567",
    email: "juan@example.com",
    _count: { bookings: 2 },
  },
  {
    id: "g-2",
    firstName: "María",
    lastName: "López",
    dni: "32456778",
    phone: "2235412345",
    email: null,
    _count: { bookings: 0 },
  },
];

describe("HuespedesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({
      user: { id: "user-1", role: "ADMIN" },
    });
    mocks.guestFindUnique.mockResolvedValue(null);
    mocks.guestFindMany.mockResolvedValue(sampleGuests);
  });

  afterEach(() => {
    cleanup();
  });

  it("lists guests ordered by lastName/firstName and links each row to its edit view", async () => {
    render(await HuespedesPage({ searchParams: {} }));

    expect(mocks.guestFindMany).toHaveBeenCalledWith({
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { _count: { select: { bookings: true } } },
    });
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María López")).toBeInTheDocument();
    const editLinks = screen.getAllByRole("link", { name: /editar/i });
    expect(editLinks).toHaveLength(2);
    expect(editLinks[0]).toHaveAttribute(
      "href",
      "/admin/huespedes?huesped=g-1",
    );
  });

  it("search matches accented Pérez via unaccented query 'perez'", async () => {
    render(await HuespedesPage({ searchParams: { q: "perez" } }));

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("search matches case-insensitively ('JUAN') and by dni fragment '3012'", async () => {
    render(await HuespedesPage({ searchParams: { q: "JUAN" } }));
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();

    cleanup();
    render(await HuespedesPage({ searchParams: { q: "3012" } }));
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("search by phone fragment '5123' matches the guest", async () => {
    render(await HuespedesPage({ searchParams: { q: "5123" } }));

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María López")).not.toBeInTheDocument();
  });

  it("renders the empty-search state when nothing matches", async () => {
    render(await HuespedesPage({ searchParams: { q: "inexistente" } }));

    expect(screen.getByText(/no hay huéspedes que coincidan/i)).toBeInTheDocument();
    expect(screen.queryByText("Juan Pérez")).not.toBeInTheDocument();
  });

  it("edit row is selected via the huesped param and pre-filled in the form", async () => {
    mocks.guestFindUnique.mockResolvedValue({
      id: "g-1",
      firstName: "Juan",
      lastName: "Pérez",
      dni: "30123456",
      phone: "1551234567",
      email: "juan@example.com",
      notes: null,
    });

    render(await HuespedesPage({ searchParams: { huesped: "g-1" } }));

    expect(mocks.guestFindUnique).toHaveBeenCalledWith({
      where: { id: "g-1" },
    });
    expect(screen.getByDisplayValue("30123456")).toBeInTheDocument();
    expect(screen.getByDisplayValue("juan@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
  });

  it("guard banner rendered on the reservas error param", async () => {
    render(await HuespedesPage({ searchParams: { error: "reservas" } }));

    const banner = screen.getByRole("alert");
    expect(
      within(banner).getByText(/el huésped tiene reservas asociadas/i),
    ).toBeInTheDocument();
  });

  it("shows the create form when no huesped param is given", async () => {
    render(await HuespedesPage({ searchParams: {} }));

    expect(
      screen.getByRole("button", { name: "Crear huésped" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
  });
});
