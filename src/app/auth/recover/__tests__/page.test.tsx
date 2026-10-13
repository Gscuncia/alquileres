import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  RecoverForm: () => <div data-testid="recover-form" />,
}));

vi.mock("@/components/auth/recover-form", () => ({
  RecoverForm: () => mocks.RecoverForm(),
}));

import RecoverPage from "@/app/auth/recover/page";

describe("RecoverPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the recovery heading and form", () => {
    render(<RecoverPage />);

    expect(
      screen.getByRole("heading", { name: /recuperar contraseña/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ingresá tu email y te enviaremos un enlace/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("recover-form")).toBeInTheDocument();
  });
});
