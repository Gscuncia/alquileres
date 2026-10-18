"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import type { PropertyImage } from "@/lib/image-framing";
import { Button } from "@/components/design-system";
import { AdminField, AdminInput } from "@/components/admin/primitives";
import { ImageFramingEditor } from "@/components/admin/ImageFramingEditor";

export interface AboutContentFormValues {
  intro: string;
  body: string;
  images: PropertyImage[];
}

/**
 * Editor for the «Quienes somos» page: intro, body paragraphs (blank-line
 * separated) and the ordered photo list, first photo being the cover.
 */
export function AboutContentForm({
  action,
  initialValues,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues: AboutContentFormValues;
}) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [images, setImages] = useState<PropertyImage[]>(initialValues.images);
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

      <AdminField label="Bajada del título" htmlFor="intro" error={fieldErrors.intro}>
        <AdminInput
          id="intro"
          name="intro"
          type="text"
          defaultValue={initialValues.intro}
        />
      </AdminField>

      <AdminField label="Texto de la página (párrafos separados por una línea en blanco)" htmlFor="body" error={fieldErrors.body}>
        <AdminInput
          as="textarea"
          id="body"
          name="body"
          rows={10}
          defaultValue={initialValues.body}
        />
      </AdminField>

      <ImageFramingEditor
        label="Fotos de la página (la primera se muestra como imagen principal)"
        rows={images}
        onChange={(index, patch) =>
          setImages((rows) =>
            rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
          )
        }
        onAdd={() =>
          setImages((rows) => [
            ...rows,
            { url: "", fit: "cover", x: 50, y: 50, zoom: 1 },
          ])
        }
        onRemove={(index) =>
          setImages((rows) => rows.filter((_, i) => i !== index))
        }
        onMoveUp={(index) =>
          setImages((rows) => {
            if (index <= 0) return rows;
            const next = [...rows];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
          })
        }
        onMoveDown={(index) =>
          setImages((rows) => {
            if (index >= rows.length - 1) return rows;
            const next = [...rows];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
          })
        }
        error={fieldErrors.images}
      />

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
