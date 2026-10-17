import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuestPicker, type GuestOption } from "../GuestPicker";

const guests: GuestOption[] = [
  {
    id: "g1",
    firstName: "Juan",
    lastName: "Pérez",
    dni: "30123456",
    phone: "1551234567",
  },
  {
    id: "g2",
    firstName: "Ana",
    lastName: "García",
    dni: "27890123",
    phone: "1565554433",
  },
];

describe("GuestPicker", () => {
  it("shows a prominent create-guest call to action when no guests exist", () => {
    render(<GuestPicker guests={[]} />);

    expect(
      screen.getByText(/todavía no hay huéspedes cargados/i),
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /crear huésped primero/i });
    expect(link).toHaveAttribute("href", "/admin/huespedes");
    expect(
      screen.queryByRole("combobox", { name: /huésped/i }),
    ).not.toBeInTheDocument();
  });

  it("renders a required native dropdown listing loaded guests", () => {
    render(<GuestPicker guests={guests} />);

    const select = screen.getByRole("combobox", { name: /huésped/i });
    expect(select).toHaveAttribute("required");

    // Loaded guests appear as options, identified by name + DNI.
    expect(
      screen.getByRole("option", { name: "Juan Pérez — DNI 30123456" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Ana García — DNI 27890123" }),
    ).toBeInTheDocument();
  });

  it("starts without a selection and submits the chosen guest id", () => {
    render(<GuestPicker guests={guests} />);

    const select = screen.getByRole("combobox", { name: /huésped/i }) as HTMLSelectElement;
    expect(select).toHaveValue("");

    fireEvent.change(select, { target: { value: "g1" } });
    expect(select).toHaveValue("g1");
  });

  it("preselects the given guest when editing", () => {
    render(<GuestPicker guests={guests} defaultValue="g2" />);

    const select = screen.getByRole("combobox", { name: /huésped/i }) as HTMLSelectElement;
    expect(select).toHaveValue("g2");
  });

  it("filters guests by first name, last name, full name, DNI and phone", () => {
    render(<GuestPicker guests={guests} />);

    const search = screen.getByRole("searchbox", { name: /buscar huésped/i });
    const select = screen.getByRole("combobox", { name: /huésped/i }) as HTMLSelectElement;

    fireEvent.change(search, { target: { value: "Juan" } });
    expect(
      screen.getByRole("option", { name: "Juan Pérez — DNI 30123456" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Ana García — DNI 27890123" }),
    ).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "García" } });
    expect(
      screen.getByRole("option", { name: "Ana García — DNI 27890123" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Juan Pérez — DNI 30123456" }),
    ).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "Ana García" } });
    expect(
      screen.getByRole("option", { name: "Ana García — DNI 27890123" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "Juan Pérez — DNI 30123456" }),
    ).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: "27890" } });
    expect(screen.getByRole("option", { name: "Ana García — DNI 27890123" })).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "6555" } });
    expect(screen.getByRole("option", { name: "Ana García — DNI 27890123" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Juan Pérez — DNI 30123456" })).not.toBeInTheDocument();
  });

  it("matches accents insensitively and clears back to the full list", () => {
    render(<GuestPicker guests={guests} />);

    const search = screen.getByRole("searchbox", { name: /buscar huésped/i });
    fireEvent.change(search, { target: { value: "GARCIA" } });
    expect(
      screen.getByRole("option", { name: "Ana García — DNI 27890123" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 de 2 huéspedes coinciden/i)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "" } });
    expect(screen.getByRole("option", { name: "Juan Pérez — DNI 30123456" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ana García — DNI 27890123" })).toBeInTheDocument();
  });

  it("shows a no-results option when the search matches nobody", () => {
    render(<GuestPicker guests={guests} />);

    const search = screen.getByRole("searchbox", { name: /buscar huésped/i });
    fireEvent.change(search, { target: { value: "gnomo" } });

    expect(
      screen.getByText(/sin huéspedes que coincidan con la búsqueda/i),
    ).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: /huésped/i }) as HTMLSelectElement;
    expect(select).toHaveValue("");
  });
});
