import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AdminField,
  AdminInput,
  AdminLabel,
  AdminError,
  AdminPanel,
  AdminEmptyState,
  AdminPageHeader,
} from "@/components/admin/primitives";

describe("Admin primitives", () => {
  describe("AdminInput", () => {
    it("renders an input with the design-system token classes", () => {
      render(<AdminInput data-testid="input" />);
      const input = screen.getByTestId("input");
      expect(input.tagName).toBe("INPUT");
      expect(input).toHaveClass(
        "w-full",
        "rounded-sm",
        "border",
        "border-hairline",
        "bg-canvas",
        "px-3",
        "py-2",
        "text-body-sm",
        "text-ink",
        "focus:border-primary",
        "focus:outline-none",
        "focus:ring-2",
        "focus:ring-primary",
      );
    });

    it("can render as a select", () => {
      render(
        <AdminInput as="select" data-testid="select">
          <option value="a">A</option>
        </AdminInput>,
      );
      const select = screen.getByTestId("select");
      expect(select.tagName).toBe("SELECT");
      expect(select).toHaveClass("w-full", "bg-canvas", "text-body-sm");
    });

    it("can render as a textarea", () => {
      render(<AdminInput as="textarea" data-testid="textarea" rows={4} />);
      const textarea = screen.getByTestId("textarea");
      expect(textarea.tagName).toBe("TEXTAREA");
      expect(textarea).toHaveAttribute("rows", "4");
      expect(textarea).toHaveClass("w-full", "bg-canvas", "text-body-sm");
    });

    it("forwards additional props", () => {
      render(<AdminInput data-testid="input" placeholder="Ejemplo" disabled />);
      const input = screen.getByTestId("input");
      expect(input).toHaveAttribute("placeholder", "Ejemplo");
      expect(input).toBeDisabled();
    });

    it("merges extra className without losing tokens", () => {
      render(<AdminInput data-testid="input" className="extra-class" />);
      const input = screen.getByTestId("input");
      expect(input).toHaveClass("extra-class");
      expect(input).toHaveClass("focus:ring-primary");
    });
  });

  describe("AdminLabel", () => {
    it("renders a label with the caption token classes", () => {
      render(<AdminLabel htmlFor="name">Nombre</AdminLabel>);
      const label = screen.getByText("Nombre");
      expect(label.tagName).toBe("LABEL");
      expect(label).toHaveAttribute("for", "name");
      expect(label).toHaveClass(
        "block",
        "text-caption-sm",
        "font-medium",
        "text-ink",
        "mb-1",
      );
    });
  });

  describe("AdminError", () => {
    it("renders nothing when no message is provided", () => {
      const { container } = render(<AdminError />);
      expect(container.firstChild).toBeNull();
    });

    it("renders the error with primary error text tokens", () => {
      render(<AdminError message="Campo requerido" />);
      const error = screen.getByText("Campo requerido");
      expect(error.tagName).toBe("P");
      expect(error).toHaveClass(
        "mt-1",
        "text-caption-sm",
        "text-primary-error-text",
      );
    });
  });

  describe("AdminField", () => {
    it("composes label, children, and error", () => {
      render(
        <AdminField label="Email" htmlFor="email" error="Inválido">
          <AdminInput id="email" data-testid="email-input" />
        </AdminField>,
      );

      expect(screen.getByText("Email")).toBeInTheDocument();
      expect(screen.getByTestId("email-input")).toBeInTheDocument();
      expect(screen.getByText("Inválido")).toBeInTheDocument();
    });

    it("associates the label with the input via htmlFor", () => {
      render(
        <AdminField label="Nombre" htmlFor="name">
          <AdminInput id="name" data-testid="name-input" />
        </AdminField>,
      );

      const label = screen.getByText("Nombre");
      expect(label).toHaveAttribute("for", "name");
    });

    it("does not render an error element when error is undefined", () => {
      const { container } = render(
        <AdminField label="Apellido" htmlFor="surname">
          <AdminInput id="surname" data-testid="surname-input" />
        </AdminField>,
      );

      expect(container.querySelector(".text-primary-error-text")).toBeNull();
    });
  });

  describe("AdminPanel", () => {
    it("renders children with card surface tokens", () => {
      render(
        <AdminPanel>
          <div data-testid="panel-content">Contenido</div>
        </AdminPanel>,
      );

      const panel = screen.getByTestId("panel-content").parentElement;
      expect(panel).toHaveClass(
        "rounded-md",
        "border",
        "border-hairline",
        "bg-surface-card",
        "p-4",
        "shadow-card",
      );
    });

    it("renders a title with display tokens when provided", () => {
      render(
        <AdminPanel title="Configuración">
          <div data-testid="panel-content">Contenido</div>
        </AdminPanel>,
      );

      const title = screen.getByText("Configuración");
      expect(title.tagName).toBe("H2");
      expect(title).toHaveClass("text-display-sm", "font-semibold", "text-ink");
    });
  });

  describe("AdminEmptyState", () => {
    it("renders children with soft surface tokens", () => {
      render(
        <AdminEmptyState>
          <span data-testid="empty-text">Sin resultados</span>
        </AdminEmptyState>,
      );

      const empty = screen.getByTestId("empty-text").parentElement?.parentElement;
      expect(empty).toHaveClass(
        "rounded-md",
        "border",
        "border-hairline",
        "bg-surface-soft",
        "p-6",
        "text-body-md",
        "text-body",
      );
    });

    it("renders the action when provided", () => {
      render(
        <AdminEmptyState action={<button>Crear</button>}>
          <span>Sin resultados</span>
        </AdminEmptyState>,
      );

      expect(screen.getByRole("button", { name: "Crear" })).toBeInTheDocument();
    });
  });

  describe("AdminPageHeader", () => {
    it("renders the title with display tokens", () => {
      render(<AdminPageHeader title="Dashboard" />);
      const title = screen.getByText("Dashboard");
      expect(title.tagName).toBe("H1");
      expect(title).toHaveClass("text-display-sm", "font-semibold", "text-ink");
    });

    it("renders the action on the right side", () => {
      render(
        <AdminPageHeader
          title="Propiedades"
          action={<button>Nueva propiedad</button>}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Nueva propiedad" }),
      ).toBeInTheDocument();
    });
  });
});
