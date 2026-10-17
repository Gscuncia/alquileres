import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const formState = vi.hoisted(() => ({
  value: { ok: false } as { ok: boolean; message?: string },
}));

// Plain react-dom 18.3.1 does not export useFormState (only Next's vendored
// canary does), so tests stub it with the current state and the action itself.
vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useFormState: () => [formState.value, () => Promise.resolve(formState.value), false],
  };
});

import { PropertyForm } from "@/components/admin/PropertyForm";
import type { ActionState } from "@/lib/admin-action-types";

const mockAction = vi.fn(
  (_prev: ActionState, _formData: FormData) => Promise.resolve({ ok: true }),
);

describe("PropertyForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formState.value = { ok: false };
  });

  it("renders every field with Spanish labels", () => {
    render(<PropertyForm action={mockAction} />);

    expect(screen.getByLabelText(/título/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ubicación/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción corta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descripción completa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/capacidad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/dormitorios/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/baños/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/orden/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /publicada/i })).toBeChecked();
    expect(
      screen.getByRole("button", { name: /guardar/i }),
    ).toBeInTheDocument();
  });

  it("auto-suggests a slug from the title and keeps it editable", async () => {
    const user = userEvent.setup();
    render(<PropertyForm action={mockAction} />);

    const title = screen.getByLabelText(/título/i);
    const slug = screen.getByLabelText(/slug/i);

    await user.type(title, "Casa Neuquén");
    expect(slug).toHaveValue("casa-neuquen");

    await user.clear(slug);
    await user.type(slug, "mi-slug-propio");
    expect(slug).toHaveValue("mi-slug-propio");

    // After manual editing the suggestion no longer overrides the value.
    await user.type(title, " Sur");
    expect(slug).toHaveValue("mi-slug-propio");
  });

  it("adds and removes ordered amenity rows", async () => {
    const user = userEvent.setup();
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{ amenities: ["Wi-Fi"] }}
      />,
    );

    const firstRow = screen.getByLabelText(/comodidades 1/i);
    expect(firstRow).toHaveValue("Wi-Fi");

    await user.click(screen.getByRole("button", { name: /agregar comodidad/i }));
    await user.type(screen.getByLabelText(/comodidades 2/i), "Parrilla");
    expect(screen.getByLabelText(/comodidades 2/i)).toHaveValue("Parrilla");

    await user.click(screen.getByRole("button", { name: /quitar fila 1 de comodidades/i }));
    expect(screen.queryByLabelText(/comodidades 2/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/comodidades 1/i)).toHaveValue("Parrilla");
  });

  it("adds and removes image rows", async () => {
    const user = userEvent.setup();
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
              fit: "cover",
              position: "center",
            },
          ],
        }}
      />,
    );

    expect(screen.getByLabelText(/imágenes 1/i)).toHaveValue(
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
    );

    await user.click(screen.getByRole("button", { name: /quitar fila 1 de imágenes/i }));
    expect(screen.queryByLabelText(/imágenes 1/i)).not.toBeInTheDocument();
  });

  it("renders the framing selects with the stored values in edit mode", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "contain",
              position: "top-left",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("combobox", { name: /encuadre 1/i }),
    ).toHaveValue("contain");
    expect(
      screen.getByRole("combobox", { name: /posición 1/i }),
    ).toHaveValue("top-left");
  });

  it("defaults new image rows to cover/center", () => {
    render(<PropertyForm action={mockAction} />);

    fireEvent.click(screen.getByRole("button", { name: /agregar imagen/i }));

    expect(screen.getByRole("combobox", { name: /encuadre 1/i })).toHaveValue("cover");
    expect(screen.getByRole("combobox", { name: /posición 1/i })).toHaveValue("center");
  });

  it("converts a pasted raw Drive link to the direct thumbnail URL", () => {
    render(<PropertyForm action={mockAction} />);

    fireEvent.click(screen.getByRole("button", { name: /agregar imagen/i }));
    const imageRow = screen.getByLabelText(/imágenes 1/i);

    // fireEvent.change mirrors a paste: the normalizer sees the full URL at
    // once (char-by-char typing would convert as soon as the partial id
    // reaches 10 chars and desync the rest of the keystrokes).
    fireEvent.change(imageRow, {
      target: {
        value:
          "https://drive.google.com/file/d/1AbC_dEf-1234567890/view?usp=sharing",
      },
    });

    expect(imageRow).toHaveValue(
      "https://drive.google.com/thumbnail?id=1AbC_dEf-1234567890&sz=w1200",
    );
  });

  it("shows the success banner when the action succeeds", () => {
    formState.value = { ok: true, message: "Los cambios se guardaron correctamente." };

    render(<PropertyForm action={mockAction} />);

    expect(
      screen.getByText(/los cambios se guardaron correctamente./i),
    ).toBeInTheDocument();
  });

  it("renders Spanish field errors under the matching inputs", () => {
    formState.value = {
      ok: false,
      fieldErrors: { title: "El título es obligatorio.", images: "Cada imagen debe ser una URL válida (http o https)." },
    };

    render(<PropertyForm action={mockAction} />);

    expect(screen.getByText(/el título es obligatorio./i)).toBeInTheDocument();
    expect(
      screen.getByText(/cada imagen debe ser una url válida/i),
    ).toBeInTheDocument();
  });

  it("renders initial values in edit mode", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          id: "prop-1",
          title: "Casita del centro",
          slug: "casita",
          capacity: "4",
          bedrooms: "2",
          bathrooms: "1",
          published: false,
          sortOrder: "3",
        }}
      />,
    );

    expect(screen.getByLabelText(/título/i)).toHaveValue("Casita del centro");
    expect(screen.getByLabelText(/slug/i)).toHaveValue("casita");
    expect(screen.getByLabelText(/capacidad/i)).toHaveValue(4);
    expect(screen.getByRole("checkbox", { name: /publicada/i })).not.toBeChecked();
    expect(screen.getByLabelText(/orden/i)).toHaveValue(3);
  });
});
