import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does); BookingForm needs it, so tests stub it like the page tests.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

import { BookingForm, EMPTY_BOOKING_FORM } from "@/components/admin/BookingForm";
import type { ActionState } from "@/lib/admin-action-types";

const action = vi.fn(
  async (_prev: ActionState, _formData: FormData): Promise<ActionState> => ({
    ok: false,
  }),
);

const guests = [
  {
    id: "g-1",
    firstName: "Juan",
    lastName: "Pérez",
    dni: "32456778",
    phone: "2231555555",
  },
];

const recipients = [
  { id: "r-1", name: "Sonia" },
  { id: "r-2", name: "Pablo" },
];

function renderForm() {
  return render(
    <BookingForm action={action} guests={guests} recipients={recipients} />,
  );
}

function setByLabel(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), {
    target: { value },
  });
}

/** Both payment groups share the "Tipo de pago" label; pick one by id. */
function paymentTypeSelect(id: string): HTMLSelectElement {
  return screen
    .getAllByLabelText("Tipo de pago")
    .find((node) => node.id === id) as HTMLSelectElement;
}

describe("BookingForm payment split", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders both payment groups side by side", () => {
    renderForm();

    expect(screen.getByText("Pago de la seña")).toBeInTheDocument();
    expect(screen.getByText("Pago restante")).toBeInTheDocument();
    // Each group owns its own tipo de pago select.
    expect(paymentTypeSelect("depositPaymentType")).toBeDefined();
    expect(paymentTypeSelect("restPaymentType")).toBeDefined();
  });

  it("shows a dash for the total when the stay dates are incomplete", () => {
    renderForm();

    expect(screen.getByText("Monto total de la reserva")).toBeInTheDocument();
    expect(screen.getByText("Monto a pagar")).toBeInTheDocument();
    // Summary rows: nights + total + rest.
    expect(screen.getAllByText("—")).toHaveLength(3);
  });

  it("counts the nights as soon as the stay dates are complete", () => {
    renderForm();

    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");

    expect(screen.getByText("Cantidad de noches")).toBeInTheDocument();
    expect(screen.getByText("3 noches")).toBeInTheDocument();
  });

  it("computes the live total from price × nights", () => {
    renderForm();

    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");
    setByLabel("Precio por noche", "150");

    // 3 nights × $150 = $450; with deposit 0 both rows show the total.
    expect(screen.getAllByText("$ 450,00")).toHaveLength(2);
  });

  it("updates the monto a pagar when the seña changes", () => {
    renderForm();

    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");
    setByLabel("Precio por noche", "150");
    setByLabel("Seña", "100");

    expect(screen.getByText("$ 350,00")).toBeInTheDocument();
  });

  it("never shows a negative monto a pagar", () => {
    renderForm();

    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");
    setByLabel("Precio por noche", "150");
    setByLabel("Seña", "500");

    expect(screen.getByText("$ 0,00")).toBeInTheDocument();
  });

  it("reveals the deposit destinatario select only for transferencia", () => {
    renderForm();

    // EFECTIVO (default): no destinatario selects at all.
    expect(screen.queryByLabelText("Destinatario")).toBeNull();

    fireEvent.change(paymentTypeSelect("depositPaymentType"), {
      target: { value: "TRANSFERENCIA" },
    });

    const select = screen.getByLabelText("Destinatario") as HTMLSelectElement;
    expect(select.id).toBe("depositRecipientId");
    expect(select).toHaveValue("");
    // The rest group's destinatario stays hidden.
    expect(screen.queryByLabelText(/monto a pagar/)).toBeNull();
  });

  it("reveals the rest destinatario select when the rest group switches to transferencia", () => {
    renderForm();

    const restSelect = paymentTypeSelect("restPaymentType");
    expect(restSelect).toBeDefined();

    fireEvent.change(restSelect, { target: { value: "TRANSFERENCIA" } });

    const recipientSelect = screen.getByLabelText(
      "Destinatario",
    ) as HTMLSelectElement;
    expect(recipientSelect.id).toBe("restRecipientId");
  });

  it("EMPTY_BOOKING_FORM defaults both parts to efectivo with empty recipients", () => {
    expect(EMPTY_BOOKING_FORM.depositPaymentType).toBe("EFECTIVO");
    expect(EMPTY_BOOKING_FORM.restPaymentType).toBe("EFECTIVO");
    expect(EMPTY_BOOKING_FORM.depositRecipientId).toBe("");
    expect(EMPTY_BOOKING_FORM.restRecipientId).toBe("");
    expect(EMPTY_BOOKING_FORM.depositPaymentMethod).toBe("");
  });

  it("warns and blocks the submit when the stay overlaps an existing booking", () => {
    render(
      <BookingForm
        action={action}
        guests={guests}
        recipients={recipients}
        properties={[{ id: "p-1", title: "Depto 1" }]}
        bookings={[
          {
            id: "b-existing",
            propertyId: "p-1",
            guestName: "Rocio Santillan",
            checkIn: "2026-10-11T15:00:00.000Z",
            checkOut: "2026-10-15T13:00:00.000Z",
          },
        ]}
      />,
    );

    fireEvent.change(screen.getByLabelText("Propiedad"), {
      target: { value: "p-1" },
    });
    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Depto 1 ya está reservado por Rocio Santillan/i,
    );
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();
  });

  it("stays silent for a different property or a non-overlapping stay", () => {
    render(
      <BookingForm
        action={action}
        guests={guests}
        recipients={recipients}
        properties={[
          { id: "p-1", title: "Depto 1" },
          { id: "p-2", title: "Casita" },
        ]}
        bookings={[
          {
            id: "b-existing",
            propertyId: "p-1",
            guestName: "Rocio Santillan",
            checkIn: "2026-10-11T15:00:00.000Z",
            checkOut: "2026-10-15T13:00:00.000Z",
          },
        ]}
      />,
    );

    // Same dates, other property: no conflict.
    fireEvent.change(screen.getByLabelText("Propiedad"), {
      target: { value: "p-2" },
    });
    setByLabel("Fecha de ingreso", "2026-10-10");
    setByLabel("Fecha de egreso", "2026-10-13");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Same property, stay AFTER the existing one: no conflict either.
    fireEvent.change(screen.getByLabelText("Propiedad"), {
      target: { value: "p-1" },
    });
    setByLabel("Fecha de ingreso", "2026-10-15");
    setByLabel("Fecha de egreso", "2026-10-18");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).not.toBeDisabled();
  });

  it("never conflicts with the booking being edited itself", () => {
    render(
      <BookingForm
        action={action}
        guests={guests}
        recipients={recipients}
        properties={[{ id: "p-1", title: "Depto 1" }]}
        initialValues={{
          id: "b-existing",
          propertyId: "p-1",
          checkInDate: "2026-10-10",
          checkInTime: "12:00",
          checkOutDate: "2026-10-13",
          checkOutTime: "10:00",
        }}
        bookings={[
          {
            id: "b-existing",
            propertyId: "p-1",
            guestName: "Juan Pérez",
            checkIn: "2026-10-11T15:00:00.000Z",
            checkOut: "2026-10-15T13:00:00.000Z",
          },
        ]}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).not.toBeDisabled();
  });
});
