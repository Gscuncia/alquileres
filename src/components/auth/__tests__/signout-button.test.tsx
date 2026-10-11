import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import { SignOutButton } from "@/components/auth/signout-button";

vi.mock("next-auth/react");

describe("SignOutButton", () => {
  it("calls signOut with callbackUrl '/' when clicked", async () => {
    render(<SignOutButton />);

    const button = screen.getByRole("button", { name: /cerrar sesión/i });
    await userEvent.click(button);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
