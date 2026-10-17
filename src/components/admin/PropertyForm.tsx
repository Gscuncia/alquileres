"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { toDirectDriveUrl } from "@/lib/drive-url";
import {
  IMAGE_FITS,
  IMAGE_POSITIONS,
  type ImageFit,
  type ImagePosition,
  type PropertyImage,
} from "@/lib/image-framing";
import { Button } from "@/components/design-system";
import {
  AdminField,
  AdminInput,
  AdminError,
} from "@/components/admin/primitives";

export interface PropertyFormValues {
  id?: string;
  title: string;
  slug: string;
  location: string;
  shortDescription: string;
  description: string;
  capacity: string;
  bedrooms: string;
  bathrooms: string;
  amenities: string[];
  images: PropertyImage[];
  /** Custom calendar color (`#rrggbb`) or "" for the palette fallback. */
  color: string;
  published: boolean;
  sortOrder: string;
}

interface PropertyFormProps {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues?: Partial<PropertyFormValues>;
  submitLabel?: string;
}

export const EMPTY_PROPERTY_FORM: PropertyFormValues = {
  title: "",
  slug: "",
  location: "",
  shortDescription: "",
  description: "",
  capacity: "",
  bedrooms: "",
  bathrooms: "",
  amenities: [],
  images: [],
  color: "",
  published: true,
  sortOrder: "0",
};

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const FIT_OPTIONS: ReadonlyArray<{ value: ImageFit; label: string }> = [
  { value: "cover", label: "Llenar el cuadro" },
  { value: "contain", label: "Mostrar completa" },
];

const POSITION_OPTIONS: ReadonlyArray<{
  value: ImagePosition;
  label: string;
}> = [
  { value: "top-left", label: "Esquina superior izquierda" },
  { value: "top", label: "Arriba" },
  { value: "top-right", label: "Esquina superior derecha" },
  { value: "left", label: "Izquierda" },
  { value: "center", label: "Centro" },
  { value: "right", label: "Derecha" },
  { value: "bottom-left", label: "Esquina inferior izquierda" },
  { value: "bottom", label: "Abajo" },
  { value: "bottom-right", label: "Esquina inferior derecha" },
];

/**
 * Ordered image-rows editor: each row submits three parallel entries
 * (`images` URL, `imageFit`, `imagePosition`) in DOM order so the action can
 * zip them by index. The position select is never disabled: disabled selects
 * do not submit and would break the FormData alignment.
 */
function ImageListEditor({
  rows,
  onChangeUrl,
  onChangeFit,
  onChangePosition,
  onAdd,
  onRemove,
  error,
}: {
  rows: PropertyImage[];
  onChangeUrl: (index: number, value: string) => void;
  onChangeFit: (index: number, value: ImageFit) => void;
  onChangePosition: (index: number, value: ImagePosition) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string;
}) {
  return (
    <fieldset>
      <legend className="block text-caption-sm font-medium text-ink mb-1">
        Imágenes
      </legend>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <AdminInput
              name="images"
              type="url"
              value={row.url}
              placeholder="https://…"
              aria-label={`Imágenes ${index + 1}`}
              onChange={(event) => onChangeUrl(index, event.target.value)}
            />
            <select
              name="imageFit"
              value={row.fit}
              aria-label={`Encuadre ${index + 1}`}
              className="h-10 rounded-sm border border-hairline bg-canvas px-2 text-body-sm text-ink"
              onChange={(event) =>
                onChangeFit(
                  index,
                  (IMAGE_FITS as readonly string[]).includes(event.target.value)
                    ? (event.target.value as ImageFit)
                    : "cover",
                )
              }
            >
              {FIT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              name="imagePosition"
              value={row.position}
              aria-label={`Posición ${index + 1}`}
              className="h-10 rounded-sm border border-hairline bg-canvas px-2 text-body-sm text-ink"
              onChange={(event) =>
                onChangePosition(
                  index,
                  (IMAGE_POSITIONS as readonly string[]).includes(
                    event.target.value,
                  )
                    ? (event.target.value as ImagePosition)
                    : "center",
                )
              }
            >
              {POSITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRemove(index)}
              aria-label={`Quitar fila ${index + 1} de Imágenes`}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" onClick={onAdd} className="mt-2">
        Agregar imagen
      </Button>
      <AdminError message={error} />
    </fieldset>
  );
}

/**
 * Ordered list editor: one controlled input per row (name repeated), with
 * add/remove controls. Removing a row filters the state so the remaining
 * controlled inputs stay aligned with the submitted order.
 */
function ListEditor({
  name,
  label,
  addLabel,
  rows,
  onChange,
  onAdd,
  onRemove,
  error,
  placeholder,
  type = "text",
}: {
  name: string;
  label: string;
  addLabel: string;
  rows: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string;
  placeholder?: string;
  type?: "text" | "url";
}) {
  return (
    <fieldset>
      <legend className="block text-caption-sm font-medium text-ink mb-1">{label}</legend>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <AdminInput
              name={name}
              type={type}
              value={row}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => onChange(index, event.target.value)}
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() => onRemove(index)}
              aria-label={`Quitar fila ${index + 1} de ${label}`}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onAdd}
        className="mt-2"
      >
        {addLabel}
      </Button>
      <AdminError message={error} />
    </fieldset>
  );
}

export function PropertyForm({
  action,
  initialValues,
  submitLabel = "Guardar",
}: PropertyFormProps) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [slug, setSlug] = useState(initialValues?.slug ?? EMPTY_PROPERTY_FORM.slug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [amenities, setAmenities] = useState<string[]>(
    initialValues?.amenities ?? EMPTY_PROPERTY_FORM.amenities,
  );
  const [images, setImages] = useState<PropertyImage[]>(
    initialValues?.images ?? EMPTY_PROPERTY_FORM.images,
  );
  const [customColor, setCustomColor] = useState(
    Boolean(initialValues?.color),
  );

  const values = { ...EMPTY_PROPERTY_FORM, ...initialValues };
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.ok && (
        <div
          role="status"
          className="rounded-sm border border-hairline bg-sky px-4 py-3 text-body-sm text-ink"
        >
          Los cambios se guardaron correctamente.
        </div>
      )}
      {!state.ok && state.message && (
        <div
          role="alert"
          className="rounded-sm border border-hairline bg-surface-soft px-4 py-3 text-body-sm text-primary-error-text"
        >
          {state.message}
        </div>
      )}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AdminField label="Título" htmlFor="title" error={fieldErrors.title}>
          <AdminInput
            id="title"
            name="title"
            type="text"
            defaultValue={values.title}
            onChange={(event) => {
              if (!slugTouched) {
                setSlug(slugify(event.target.value));
              }
            }}
          />
        </AdminField>
        <AdminField label="Slug" htmlFor="slug" error={fieldErrors.slug}>
          <AdminInput
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
          />
        </AdminField>
      </div>

      <AdminField label="Ubicación" htmlFor="location" error={fieldErrors.location}>
        <AdminInput
          id="location"
          name="location"
          type="text"
          defaultValue={values.location}
        />
      </AdminField>

      <AdminField label="Descripción corta" htmlFor="shortDescription" error={fieldErrors.shortDescription}>
        <AdminInput
          id="shortDescription"
          name="shortDescription"
          type="text"
          defaultValue={values.shortDescription}
        />
      </AdminField>

      <AdminField label="Descripción completa" htmlFor="description" error={fieldErrors.description}>
        <AdminInput
          as="textarea"
          id="description"
          name="description"
          rows={6}
          defaultValue={values.description}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Separá los párrafos con una línea en blanco.
        </p>
      </AdminField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <AdminField label="Capacidad" htmlFor="capacity" error={fieldErrors.capacity}>
          <AdminInput
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={values.capacity}
          />
        </AdminField>
        <AdminField label="Dormitorios" htmlFor="bedrooms" error={fieldErrors.bedrooms}>
          <AdminInput
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={values.bedrooms}
          />
        </AdminField>
        <AdminField label="Baños" htmlFor="bathrooms" error={fieldErrors.bathrooms}>
          <AdminInput
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            defaultValue={values.bathrooms}
          />
        </AdminField>
        <AdminField label="Orden" htmlFor="sortOrder" error={fieldErrors.sortOrder}>
          <AdminInput
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={values.sortOrder}
          />
        </AdminField>
      </div>

      <ListEditor
        name="amenities"
        label="Comodidades"
        addLabel="Agregar comodidad"
        rows={amenities}
        onChange={(index, value) =>
          setAmenities((rows) =>
            rows.map((row, i) => (i === index ? value : row)),
          )
        }
        onAdd={() => setAmenities((rows) => [...rows, ""])}
        onRemove={(index) =>
          setAmenities((rows) => rows.filter((_, i) => i !== index))
        }
        error={fieldErrors.amenities}
        placeholder="Wi-Fi"
      />

      <ImageListEditor
        rows={images}
        onChangeUrl={(index, value) =>
          setImages((rows) =>
            rows.map((row, i) =>
              i === index ? { ...row, url: toDirectDriveUrl(value) } : row,
            ),
          )
        }
        onChangeFit={(index, value) =>
          setImages((rows) =>
            rows.map((row, i) => (i === index ? { ...row, fit: value } : row)),
          )
        }
        onChangePosition={(index, value) =>
          setImages((rows) =>
            rows.map((row, i) =>
              i === index ? { ...row, position: value } : row,
            ),
          )
        }
        onAdd={() =>
          setImages((rows) => [
            ...rows,
            { url: "", fit: "cover", position: "center" },
          ])
        }
        onRemove={(index) =>
          setImages((rows) => rows.filter((_, i) => i !== index))
        }
        error={fieldErrors.images}
      />
      <p className="-mt-4 text-caption-sm text-muted">
        Podés pegar el link de cualquier foto compartida de Google Drive
        («cualquiera con el enlace») y se convierte automáticamente a un link
        directo. También acepta URLs de imagen de cualquier otro sitio.
      </p>
      <p className="-mt-4 text-caption-sm text-muted">
        Usá el selector de encuadre para elegir qué parte de la foto se ve en
        los recuadros cuadrados.
      </p>

      <fieldset>
        <legend className="block text-caption-sm font-medium text-ink mb-1">Color en el calendario</legend>
        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={customColor}
              onChange={(event) => setCustomColor(event.target.checked)}
              className="h-4 w-4"
              aria-label="Usar color personalizado"
            />
            <span className="text-body-sm text-ink">Color personalizado</span>
          </label>
          {customColor ? (
            <input
              type="color"
              name="color"
              defaultValue={values.color || "#460479"}
              aria-label="Color personalizado de la propiedad"
              className="h-10 w-16 cursor-pointer rounded-sm border border-hairline bg-canvas p-1"
            />
          ) : (
            <input type="hidden" name="color" value="" />
          )}
          <p className="text-caption-sm text-muted">
            Se usa para las barras y fichas de esta propiedad en el Calendario.
          </p>
        </div>
        <AdminError message={fieldErrors.color} />
      </fieldset>

      <div>
        <label htmlFor="published" className="inline-flex items-center gap-2">
          <input type="hidden" name="published" value="false" />
          <input
            id="published"
            name="published"
            type="checkbox"
            value="true"
            defaultChecked={values.published}
            className="h-4 w-4"
          />
          <span className="text-body-sm text-ink">Publicada</span>
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
