"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import { Button } from "@/components/design-system";

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
  images: string[];
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
  published: true,
  sortOrder: "0",
};

const inputClasses =
  "w-full rounded-sm border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink focus:outline-none focus:ring-2 focus:ring-ink";

const labelClasses = "block text-caption-sm font-medium text-ink mb-1";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-caption-sm text-primary-error-text">{message}</p>;
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
      <legend className={labelClasses}>{label}</legend>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={index} className="flex items-start gap-2">
            <input
              name={name}
              type={type}
              value={row}
              placeholder={placeholder}
              aria-label={`${label} ${index + 1}`}
              onChange={(event) => onChange(index, event.target.value)}
              className={inputClasses}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              aria-label={`Quitar fila ${index + 1} de ${label}`}
              className="shrink-0 rounded-sm px-3 py-2 text-button-sm text-muted hover:bg-surface-soft"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-sm border border-ink bg-canvas px-3 py-1.5 text-button-sm text-ink hover:bg-surface-soft"
      >
        {addLabel}
      </button>
      <FieldError message={error} />
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
  const [images, setImages] = useState<string[]>(
    initialValues?.images ?? EMPTY_PROPERTY_FORM.images,
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
        <div>
          <label htmlFor="title" className={labelClasses}>
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            defaultValue={values.title}
            onChange={(event) => {
              if (!slugTouched) {
                setSlug(slugify(event.target.value));
              }
            }}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.title} />
        </div>
        <div>
          <label htmlFor="slug" className={labelClasses}>
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.slug} />
        </div>
      </div>

      <div>
        <label htmlFor="location" className={labelClasses}>
          Ubicación
        </label>
        <input
          id="location"
          name="location"
          type="text"
          defaultValue={values.location}
          className={inputClasses}
        />
        <FieldError message={fieldErrors.location} />
      </div>

      <div>
        <label htmlFor="shortDescription" className={labelClasses}>
          Descripción corta
        </label>
        <input
          id="shortDescription"
          name="shortDescription"
          type="text"
          defaultValue={values.shortDescription}
          className={inputClasses}
        />
        <FieldError message={fieldErrors.shortDescription} />
      </div>

      <div>
        <label htmlFor="description" className={labelClasses}>
          Descripción completa
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
          defaultValue={values.description}
          className={inputClasses}
        />
        <p className="mt-1 text-caption-sm text-muted">
          Separá los párrafos con una línea en blanco.
        </p>
        <FieldError message={fieldErrors.description} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label htmlFor="capacity" className={labelClasses}>
            Capacidad
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min={1}
            defaultValue={values.capacity}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.capacity} />
        </div>
        <div>
          <label htmlFor="bedrooms" className={labelClasses}>
            Dormitorios
          </label>
          <input
            id="bedrooms"
            name="bedrooms"
            type="number"
            min={0}
            defaultValue={values.bedrooms}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.bedrooms} />
        </div>
        <div>
          <label htmlFor="bathrooms" className={labelClasses}>
            Baños
          </label>
          <input
            id="bathrooms"
            name="bathrooms"
            type="number"
            min={0}
            defaultValue={values.bathrooms}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.bathrooms} />
        </div>
        <div>
          <label htmlFor="sortOrder" className={labelClasses}>
            Orden
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={values.sortOrder}
            className={inputClasses}
          />
          <FieldError message={fieldErrors.sortOrder} />
        </div>
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

      <ListEditor
        name="images"
        label="Imágenes"
        addLabel="Agregar imagen"
        rows={images}
        type="url"
        onChange={(index, value) =>
          setImages((rows) => rows.map((row, i) => (i === index ? value : row)))
        }
        onAdd={() => setImages((rows) => [...rows, ""])}
        onRemove={(index) =>
          setImages((rows) => rows.filter((_, i) => i !== index))
        }
        error={fieldErrors.images}
        placeholder="https://…"
      />

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
