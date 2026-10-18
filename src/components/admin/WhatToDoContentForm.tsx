"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import type { ActionState } from "@/lib/admin-action-types";
import type { PropertyImage } from "@/lib/image-framing";
import { toDirectDriveUrl } from "@/lib/drive-url";
import { Button } from "@/components/design-system";
import {
  AdminError,
  AdminField,
  AdminInput,
} from "@/components/admin/primitives";
import { ImageRow } from "@/components/admin/ImageFramingEditor";

interface CardRow {
  title: string;
  description: string;
  image: PropertyImage;
}

const EMPTY_IMAGE: PropertyImage = {
  url: "",
  fit: "cover",
  x: 50,
  y: 50,
  zoom: 1,
};

/**
 * Editor for the «¿Qué hacer en San Clemente del Tuyú?» attraction cards.
 * Each card composes title/description inputs into the shared ImageRow so
 * the photo preview, drag-pan, zoom and reorder controls behave exactly
 * like the property image editor. The submitted FormData keeps one
 * cardTitle/cardDescription entry per row, aligned with the parallel
 * images/imageFit/imageX/imageY/imageZoom lists.
 */
export function WhatToDoContentForm({
  action,
  initialValues,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  initialValues: { intro: string; cards: CardRow[] };
}) {
  const [state, formAction] = useFormState(action, { ok: false });
  const [cards, setCards] = useState<CardRow[]>(initialValues.cards);
  const fieldErrors = state.fieldErrors ?? {};

  const updateCard = (index: number, patch: Partial<CardRow>) =>
    setCards((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

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

      <fieldset>
        <legend className="mb-1 block text-caption-sm font-medium text-ink">
          Cuadros de atracciones
        </legend>
        <div className="space-y-4">
          {cards.map((card, index) => (
            <ImageRow
              key={index}
              row={card.image}
              index={index}
              isFirst={index === 0}
              isLast={index === cards.length - 1}
              onChangeUrl={(value) =>
                updateCard(index, {
                  image: { ...card.image, url: toDirectDriveUrl(value) },
                })
              }
              onChange={(patch) =>
                updateCard(index, { image: { ...card.image, ...patch } })
              }
              onMoveUp={(i) =>
                setCards((rows) => {
                  if (i <= 0) return rows;
                  const next = [...rows];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  return next;
                })
              }
              onMoveDown={(i) =>
                setCards((rows) => {
                  if (i >= rows.length - 1) return rows;
                  const next = [...rows];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  return next;
                })
              }
              onRemove={() =>
                setCards((rows) => rows.filter((_, i) => i !== index))
              }
              extraFields={
                <>
                  <AdminField
                    label="Título del cuadro"
                    htmlFor={`cardTitle-${index + 1}`}
                  >
                    <AdminInput
                      id={`cardTitle-${index + 1}`}
                      name="cardTitle"
                      type="text"
                      value={card.title}
                      required
                      onChange={(event) =>
                        updateCard(index, { title: event.target.value })
                      }
                    />
                  </AdminField>
                  <AdminField
                    label="Descripción del cuadro"
                    htmlFor={`cardDescription-${index + 1}`}
                  >
                    <AdminInput
                      as="textarea"
                      id={`cardDescription-${index + 1}`}
                      name="cardDescription"
                      rows={3}
                      value={card.description}
                      required
                      onChange={(event) =>
                        updateCard(index, { description: event.target.value })
                      }
                    />
                  </AdminField>
                </>
              }
            />
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setCards((rows) => [
              ...rows,
              { title: "", description: "", image: { ...EMPTY_IMAGE } },
            ])
          }
          className="mt-2"
        >
          Agregar cuadro
        </Button>
        <AdminError message={fieldErrors.cards} />
      </fieldset>

      <div className="flex justify-end">
        <Button type="submit" variant="primary">
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
