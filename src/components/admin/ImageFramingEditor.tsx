"use client";

import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { toDirectDriveUrl } from "@/lib/drive-url";
import { imageStyle, type PropertyImage } from "@/lib/image-framing";
import { Button } from "@/components/design-system";
import { AdminInput, AdminError } from "@/components/admin/primitives";

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

/**
 * One image row: live square preview with pointer-drag panning, a zoom
 * slider and quick fit/reset buttons. Each row submits five parallel
 * entries in DOM order (`images` URL, hidden `imageFit`, hidden `imageX`,
 * hidden `imageY`, visible `imageZoom` slider) so the server action can zip
 * them by index. Hidden inputs must not be disabled: disabled inputs do not
 * submit and would break the FormData alignment.
 */
export function ImageRow({
  row,
  index,
  isFirst,
  isLast,
  onChangeUrl,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  extraFields,
}: {
  row: PropertyImage;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onChangeUrl: (value: string) => void;
  onChange: (patch: Partial<Pick<PropertyImage, "fit" | "x" | "y" | "zoom">>) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onRemove: () => void;
  /** Extra fields rendered inside the row's main column, after the URL input. */
  extraFields?: React.ReactNode;
}) {
  const dragState = useRef<DragState | null>(null);
  const [dragging, setDragging] = useState(false);

  // Dragging the photo right moves the content right, which reveals the
  // left side of the image: the stored focus x must decrease (inverted
  // mapping, virtual pan). Focus origin is snapshotted on pointerdown so
  // the controlled updates never fight the async pointer events.
  const handlePointerDown = (event: ReactPointerEvent<HTMLImageElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: row.x,
      originY: row.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLImageElement>) => {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const dx = ((event.clientX - state.startX) / box.width) * 100;
    const dy = ((event.clientY - state.startY) / box.height) * 100;
    onChange({
      x: Math.round(clamp(state.originX - dx, 0, 100)),
      y: Math.round(clamp(state.originY - dy, 0, 100)),
    });
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLImageElement>) => {
    if (dragState.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragState.current = null;
      setDragging(false);
    }
  };

  const isContain = row.fit === "contain";

  return (
    <div className="flex items-start gap-3">
      <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-md border border-hairline bg-surface-soft">
        {row.url === "" ? (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-caption-sm text-muted">
            Pegá una URL para ver la vista previa
          </div>
        ) : (
          <img
            src={row.url}
            alt={`Vista previa ${index + 1}`}
            style={imageStyle(row)}
            className={`h-full w-full select-none ${dragging ? "cursor-grabbing" : "cursor-move"}`}
            draggable={false}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          />
        )}
      </div>

      <div className="flex-1 space-y-2">
        <AdminInput
          name="images"
          type="url"
          value={row.url}
          placeholder="https://…"
          aria-label={`Imágenes ${index + 1}`}
          onChange={(event) => onChangeUrl(event.target.value)}
        />
        <input type="hidden" name="imageFit" value={row.fit} />
        <input type="hidden" name="imageX" value={String(Math.round(row.x))} />
        <input type="hidden" name="imageY" value={String(Math.round(row.y))} />
        {extraFields}
        <div className="flex items-center gap-2">
          <label
            htmlFor={`imageZoom-${index + 1}`}
            className="text-caption-sm font-medium text-ink"
          >
            Zoom
          </label>
          <input
            id={`imageZoom-${index + 1}`}
            type="range"
            name="imageZoom"
            min="1"
            max="3"
            step="0.05"
            value={Math.max(1, row.zoom)}
            aria-label="Zoom de la foto"
            className="h-2 w-full cursor-pointer accent-primary"
            onChange={(event) =>
              onChange({ zoom: Number(event.target.value) })
            }
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isFirst}
            onClick={() => onMoveUp?.(index)}
            aria-label={`Subir foto ${index + 1}`}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={isLast}
            onClick={() => onMoveDown?.(index)}
            aria-label={`Bajar foto ${index + 1}`}
          >
            ↓
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange({ fit: isContain ? "cover" : "contain" })}
          >
            {isContain ? "Llenar el cuadro" : "Mostrar completa"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange({ x: 50, y: 50, zoom: 1 })}
          >
            Centrar
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onRemove}
            aria-label={`Quitar fila ${index + 1} de Imágenes`}
          >
            Quitar
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Ordered image-rows editor with live framing preview and per-row reordering.
 * Rows render in display order: the first row is the property cover. Every
 * edit flows through the onChange handlers so the submitted FormData stays
 * aligned with the rendered row order.
 */
export function ImageFramingEditor({
  rows,
  onChange,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  error,
  label = "Imágenes",
}: {
  rows: PropertyImage[];
  onChange: (index: number, patch: Partial<PropertyImage>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  error?: string;
  /** Fieldset legend, overridable for non-property uses of the editor. */
  label?: string;
}) {
  return (
    <fieldset>
      <legend className="block text-caption-sm font-medium text-ink mb-1">
        {label}
      </legend>
      <div className="space-y-4">
        {rows.map((row, index) => (
          <ImageRow
            key={index}
            row={row}
            index={index}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
            onChangeUrl={(value) =>
              onChange(index, { url: toDirectDriveUrl(value) })
            }
            onChange={(patch) => onChange(index, patch)}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={() => onRemove(index)}
          />
        ))}
      </div>
      <Button type="button" variant="secondary" onClick={onAdd} className="mt-2">
        Agregar imagen
      </Button>
      <AdminError message={error} />
      <p className="mt-1 text-caption-sm text-muted">
        Arrastrá la foto y ajustá el zoom: el recuadro siempre queda lleno de
        la imagen. Para ver la foto entera usá «Mostrar completa».
      </p>
    </fieldset>
  );
}
