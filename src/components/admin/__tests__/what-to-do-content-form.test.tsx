import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does), so tests stub it with the current state and the action itself.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [{ ok: false }, () => Promise.resolve({ ok: false }), false],
  };
});

import { WhatToDoContentForm } from "@/components/admin/WhatToDoContentForm";
import { DEFAULT_WHATTODO_CONTENT } from "@/lib/site-content";
import type { ActionState } from "@/lib/admin-action-types";

const action = vi.fn(
  async (_prev: ActionState, _formData: FormData): Promise<ActionState> => ({
    ok: true,
  }),
);

describe("WhatToDoContentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one row per card with title and description inputs", () => {
    render(
      <WhatToDoContentForm
        action={action}
        initialValues={{
          intro: DEFAULT_WHATTODO_CONTENT.intro,
          cards: DEFAULT_WHATTODO_CONTENT.cards,
        }}
      />,
    );

    expect(screen.getByDisplayValue("Playa de San Clemente")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Termas Marinas"),
    ).toBeInTheDocument();
    expect(screen.getAllByLabelText(/título del cuadro/i)).toHaveLength(6);
  });

  it("keeps the submitted FormData aligned when a card title is edited", async () => {
    const user = userEvent.setup();

    render(
      <WhatToDoContentForm
        action={action}
        initialValues={{
          intro: "Planes",
          cards: [
            {
              title: "Viejo título",
              description: "Desc",
              image: {
                url: "https://example.com/playa.jpg",
                fit: "cover",
                x: 50,
                y: 50,
                zoom: 1,
              },
            },
          ],
        }}
      />,
    );

    const titleInput = screen.getByLabelText(/título del cuadro/i);
    await user.clear(titleInput);
    await user.type(titleInput, "Título nuevo");

    const form = titleInput.closest("form");
    expect(form).not.toBeNull();
    const formData = new FormData(form!);
    expect(formData.get("intro")).toBe("Planes");
    expect(formData.get("cardTitle")).toBe("Título nuevo");
    expect(formData.get("cardDescription")).toBe("Desc");
    expect(formData.get("images")).toBe("https://example.com/playa.jpg");
  });

  it("adds and removes cards", async () => {
    const user = userEvent.setup();

    render(
      <WhatToDoContentForm
        action={action}
        initialValues={{ intro: "", cards: [] }}
      />,
    );

    expect(screen.queryByLabelText(/título del cuadro/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Agregar cuadro" }));
    expect(screen.getByLabelText(/título del cuadro/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /quitar fila 1/i }));
    expect(screen.queryByLabelText(/título del cuadro/i)).not.toBeInTheDocument();
  });
});
