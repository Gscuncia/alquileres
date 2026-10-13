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
      screen.queryByPlaceholderText(/buscar huésped/i),
    ).not.toBeInTheDocument();
  });

  it("selects a guest and carries the id in the hidden guestId input", () => {
    render(<GuestPicker guests={guests} />);

    fireEvent.click(screen.getByText("Juan Pérez — 30123456"));

    const hidden = document.querySelector('input[type="hidden"][name="guestId"]');
    expect(hidden).not.toBeNull();
    expect(hidden).toHaveAttribute("value", "g1");
    expect(screen.getByText(/seleccionado:/i)).toBeInTheDocument();
  });

  it("filters guests by accent-insensitive query", () => {
    render(<GuestPicker guests={guests} />);

    fireEvent.change(screen.getByPlaceholderText(/buscar huésped/i), {
      target: { value: "perez" },
    });

    expect(screen.getByText("Juan Pérez — 30123456")).toBeInTheDocument();
    expect(screen.queryByText("Ana García — 27890123")).not.toBeInTheDocument();
  });
});
