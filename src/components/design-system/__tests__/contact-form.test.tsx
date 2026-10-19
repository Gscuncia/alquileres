import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ContactForm } from "@/components/design-system/ContactForm";

describe("ContactForm", () => {
  it("pre-fills the message when arriving from a property page", () => {
    render(
      <ContactForm
        whatsappUrl="https://wa.me/5491155052228"
        prefillMessage="Hola, quiero consultar por el alojamiento Departamento 1"
      />,
    );

    const message = screen.getByLabelText(/mensaje/i) as HTMLTextAreaElement;
    expect(message.value).toBe(
      "Hola, quiero consultar por el alojamiento Departamento 1",
    );
  });

  it("starts with an empty message on the plain contact page", () => {
    render(<ContactForm whatsappUrl="https://wa.me/5491155052228" />);

    const message = screen.getByLabelText(/mensaje/i) as HTMLTextAreaElement;
    expect(message.value).toBe("");
  });
});
