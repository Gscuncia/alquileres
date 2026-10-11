import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SignInForm } from "@/components/auth/signin-form";

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
}));

describe("SignInForm", () => {
  it("renders the sign-in form with email, password, and submit", () => {
    render(<SignInForm callbackUrl="/admin" />);

    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeInTheDocument();
  });

  it("displays the admin access heading", () => {
    render(<SignInForm callbackUrl="/admin" />);

    expect(screen.getByRole("heading", { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByText(/acceso administrativo de alquileres anita/i)).toBeInTheDocument();
  });
});
