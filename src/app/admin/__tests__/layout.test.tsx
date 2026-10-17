import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminLayout from "@/app/admin/layout";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  userFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
  },
}));


const mockUsePathname = vi.fn(() => "/admin");
const mockRedirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
);

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  redirect: (path: string) => mockRedirect(path),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

vi.mock("@/components/auth/signout-button", () => ({
  SignOutButton: () => <button type="button">Cerrar sesión</button>,
}));

vi.mock("@/components/admin/MustChangePasswordModal", () => ({
  MustChangePasswordModal: () => (
    <div role="dialog" aria-labelledby="must-change-title">
      <h2 id="must-change-title">Cambiar contraseña</h2>
      <p>Es la primera vez que ingresás.</p>
    </div>
  ),
}));

function makeAdminSession() {
  return {
    user: {
      id: "user-1",
      email: "admin@alquileresanita.com.ar",
      roleId: "role-1",
      roleName: "Administrador",
      allowedTabs: [
        "panel",
        "calendario",
        "propiedades",
        "reservas",
        "huespedes",
        "destinatarios",
        "gastos",
      ],
      isDefaultAdmin: true,
      mustChangePassword: false,
    },
  };
}

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindUnique.mockResolvedValue({ mustChangePassword: false });
  });

  it("renders navigation, user info, and logout for an authenticated admin", async () => {
    mocks.auth.mockResolvedValue(makeAdminSession());

    render(await AdminLayout({ children: <div>Dashboard content</div> }));

    expect(screen.getByRole("heading", { name: /admin/i })).toBeInTheDocument();
    expect(
      screen.getByText(/admin@alquileresanita.com.ar · Administrador/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /cerrar sesión/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /cambiar contraseña/i }),
    ).toHaveAttribute("href", "/admin/cambiar-contrasena");
    expect(screen.getByText(/dashboard content/i)).toBeInTheDocument();

    // Main-site logo and background treatment are applied to the admin header.
    const header = screen.getByRole("banner");
    expect(header).toHaveClass("bg-header-bg");
    expect(header).toHaveClass("border-cream-line");
    expect(header).toHaveClass("shadow-sm");
    const logo = screen.getByRole("img", { name: /alquileres anita/i });
    expect(logo).toBeInTheDocument();
    expect(logo.closest("a")).toHaveAttribute("href", "/");

    // Layout uses public content width and padding.
    const main = screen.getByRole("main");
    expect(header).toHaveClass("px-4");
    expect(header).toHaveClass("md:px-6");
    expect(header.firstChild).toHaveClass("max-w-[1440px]");
    expect(main).toHaveClass("max-w-[1440px]");
    expect(main).toHaveClass("px-4");
    expect(main).toHaveClass("md:px-6");

    // Sub-nav tabs: Panel · Calendario · Propiedades · Reservas · Huéspedes · Destinatarios · Gastos.
    const nav = screen.getByRole("navigation", {
      name: /secciones del panel/i,
    });
    for (const tab of ["Panel", "Calendario", "Propiedades", "Reservas", "Huéspedes", "Destinatarios", "Gastos"]) {
      expect(screen.getByText(tab)).toBeInTheDocument();
    }
    expect(
      screen.getByText("Panel").closest("a"),
    ).toHaveAttribute("href", "/admin");
    expect(
      screen.getByText("Calendario").closest("a"),
    ).toHaveAttribute("href", "/admin/calendario");
    expect(
      screen.getByText("Reservas").closest("a"),
    ).toHaveAttribute("href", "/admin/reservas");
    expect(
      screen.getByText("Gastos").closest("a"),
    ).toHaveAttribute("href", "/admin/gastos");
    expect(nav).toBeInTheDocument();
  });

  it("filters nav tabs for non-admin users based on allowedTabs", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-2",
        email: "operative@alquileresanita.com.ar",
        roleId: "role-2",
        roleName: "Gestion diaria",
        allowedTabs: ["calendario", "gastos"],
        isDefaultAdmin: false,
        mustChangePassword: false,
      },
    });

    render(await AdminLayout({ children: <div>Limited content</div> }));

    expect(screen.getByRole("link", { name: "Calendario" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gastos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Propiedades" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Reservas" })).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      AdminLayout({ children: <div>Dashboard content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT /auth/signin");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("redirects users with no allowed tabs to access-denied", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-3",
        email: "blocked@alquileresanita.com.ar",
        roleId: "role-3",
        roleName: "Sin acceso",
        allowedTabs: [],
        isDefaultAdmin: false,
        mustChangePassword: false,
      },
    });

    await expect(
      AdminLayout({ children: <div>Dashboard content</div> }),
    ).rejects.toThrow("NEXT_REDIRECT /auth/access-denied");

    expect(mockRedirect).toHaveBeenCalledWith("/auth/access-denied");
  });

  it("renders the forced password-change modal when the user must change password", async () => {
    mocks.userFindUnique.mockResolvedValue({ mustChangePassword: true });
    mocks.auth.mockResolvedValue({
      user: {
        id: "user-1",
        email: "admin@alquileresanita.com.ar",
        roleId: "role-1",
        roleName: "Administrador",
        allowedTabs: ["panel", "calendario"],
        isDefaultAdmin: true,
        mustChangePassword: true,
      },
    });

    render(await AdminLayout({ children: <div>Dashboard content</div> }));

    expect(
      screen.getByRole("dialog", { name: /cambiar contraseña/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/es la primera vez que ingresás/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/dashboard content/i)).not.toBeInTheDocument();
  });
});
