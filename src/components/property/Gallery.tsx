"use client";

import React, { useState } from "react";

export interface GalleryProps {
  images: string[];
  alt: string;
}

export const Gallery: React.FC<GalleryProps> = ({ images, alt }) => {
  const [mainIndex, setMainIndex] = useState(0);
  const mainImage = images[mainIndex] ?? images[0];
  const thumbnails = images.slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md md:aspect-square md:rounded-l-lg">
        <img
          src={mainImage}
          alt={alt}
          className="h-full w-full object-cover"
        />
        {mainIndex !== 0 && (
          <button
            type="button"
            onClick={() => setMainIndex(0)}
            aria-label="Volver a la foto de portada"
            className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-caption font-medium text-ink backdrop-blur-sm transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            ← Portada
          </button>
        )}
      </div>

      <div className="hidden grid-cols-3 gap-4 md:grid">
        {thumbnails.slice(1, 10).map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setMainIndex(index + 1)}
            className={`relative aspect-square overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              index === 2 ? "rounded-tr-lg" : ""
            } ${index === 8 ? "rounded-br-lg" : ""}`}
            aria-label={`Ver foto ${index + 2}`}
          >
            <img
              src={image}
              alt={`${alt} - foto ${index + 2}`}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto py-2 md:hidden">
        {thumbnails.map((image, index) => (
          <button
            key={image}
            type="button"
            onClick={() => setMainIndex(index)}
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              index === mainIndex ? "ring-2 ring-ink" : ""
            }`}
            aria-label={`Ver foto ${index + 1}`}
          >
            <img
              src={image}
              alt={`${alt} - foto ${index + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
};
