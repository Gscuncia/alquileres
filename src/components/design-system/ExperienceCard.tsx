"use client";

import React, { useState } from "react";
import { Badge } from "./Badge";
import { IconButton } from "./IconButton";

export interface ExperienceCardProps {
  title: string;
  image?: string;
  imageAlt?: string;
  meta?: string;
  isNew?: boolean;
  newLabel?: string;
  saved?: boolean;
  onSaveChange?: (saved: boolean) => void;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  title,
  image,
  imageAlt = title,
  meta,
  isNew = false,
  newLabel = "NUEVO",
  saved: savedProp = false,
  onSaveChange,
}) => {
  const [saved, setSaved] = useState(savedProp);

  const handleSave = () => {
    const next = !saved;
    setSaved(next);
    onSaveChange?.(next);
  };

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-surface-strong">
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
        {isNew && (
          <div className="absolute left-3 top-3">
            <Badge tone="new">{newLabel}</Badge>
          </div>
        )}
        <div className="absolute right-3 top-3">
          <IconButton
            icon="heart"
            label={saved ? "Quitar de guardados" : "Guardar"}
            variant="overlay"
            pressed={saved}
            onClick={handleSave}
          />
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-title-md text-ink">{title}</h3>
        {meta && <p className="text-body-sm text-muted">{meta}</p>}
      </div>
    </article>
  );
};
