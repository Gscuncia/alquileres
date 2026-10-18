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
              x: 50,
              y: 50,
              zoom: 1,
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

  it("renders a preview whose style reflects the stored x/y/zoom framing", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "contain",
              x: 25,
              y: 75,
              zoom: 2,
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("Vista previa 1")).toHaveStyle({
      objectFit: "contain",
      objectPosition: "25% 75%",
      transform: "scale(2)",
      transformOrigin: "25% 75%",
    });
  });

  it("omits the transform when zoom is untouched and skips the preview without a URL", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
          ],
        }}
      />,
    );

    const preview = screen.getByAltText("Vista previa 1");
    expect(preview).toHaveStyle({
      objectFit: "cover",
      objectPosition: "50% 50%",
    });
    expect(preview.getAttribute("style")).not.toContain("transform");
  });

  it("carries the aligned hidden fields with the stored values", () => {
    const { container } = render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "contain",
              x: 10,
              y: 90,
              zoom: 1.5,
            },
          ],
        }}
      />,
    );

    expect(container.querySelector('input[name="imageFit"]')).toHaveValue("contain");
    expect(container.querySelector('input[name="imageX"]')).toHaveValue("10");
    expect(container.querySelector('input[name="imageY"]')).toHaveValue("90");
    expect(container.querySelector('input[name="imageZoom"]')).toHaveValue("1.5");
  });

  it("switches the fit through the quick toggle and updates the hidden field", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /mostrar completa/i }));
    expect(container.querySelector('input[name="imageFit"]')).toHaveValue("contain");
    expect(screen.getByRole("button", { name: /llenar el cuadro/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /llenar el cuadro/i }));
    expect(container.querySelector('input[name="imageFit"]')).toHaveValue("cover");
  });

  it("centers the framing and resets the zoom with the reset button", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "cover",
              x: 10,
              y: 90,
              zoom: 2.5,
            },
          ],
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /centrar/i }));
    expect(container.querySelector('input[name="imageX"]')).toHaveValue("50");
    expect(container.querySelector('input[name="imageY"]')).toHaveValue("50");
    expect(container.querySelector('input[name="imageZoom"]')).toHaveValue("1");
  });

  it("submits the zoom slider as a numeric value in the hidden-aligned field", () => {
    const { container } = render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-a",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
          ],
        }}
      />,
    );

    const slider = screen.getByRole("slider", { name: /zoom de la foto/i });
    fireEvent.change(slider, { target: { value: "1.75" } });

    expect(container.querySelector('input[name="imageZoom"]')).toHaveValue("1.75");
    expect(slider).toHaveValue("1.75");
  });

  it("defaults new image rows to cover/center/zoom 1", () => {
    const { container } = render(<PropertyForm action={mockAction} />);

    fireEvent.click(screen.getByRole("button", { name: /agregar imagen/i }));

    expect(container.querySelector('input[name="imageFit"]')).toHaveValue("cover");
    expect(container.querySelector('input[name="imageX"]')).toHaveValue("50");
    expect(container.querySelector('input[name="imageY"]')).toHaveValue("50");
    expect(container.querySelector('input[name="imageZoom"]')).toHaveValue("1");
    expect(screen.getByText(/pegá una url para ver la vista previa/i)).toBeInTheDocument();
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

  it("reorders image rows with the up/down controls", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-first",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
            {
              url: "https://images.unsplash.com/photo-second",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
          ],
        }}
      />,
    );

    expect(screen.getByAltText("Vista previa 1")).toHaveAttribute(
      "src",
      "https://images.unsplash.com/photo-first",
    );

    fireEvent.click(screen.getByRole("button", { name: /bajar foto 1/i }));

    expect(screen.getByAltText("Vista previa 1")).toHaveAttribute(
      "src",
      "https://images.unsplash.com/photo-second",
    );
    expect(screen.getByAltText("Vista previa 2")).toHaveAttribute(
      "src",
      "https://images.unsplash.com/photo-first",
    );

    fireEvent.click(screen.getByRole("button", { name: /subir foto 2/i }));

    expect(screen.getByAltText("Vista previa 1")).toHaveAttribute(
      "src",
      "https://images.unsplash.com/photo-first",
    );
  });

  it("disables the reorder buttons at the row boundaries", () => {
    render(
      <PropertyForm
        action={mockAction}
        initialValues={{
          images: [
            {
              url: "https://images.unsplash.com/photo-only",
              fit: "cover",
              x: 50,
              y: 50,
              zoom: 1,
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: /subir foto 1/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /bajar foto 1/i }),
    ).toBeDisabled();
  });
});
