"use client";

import React, { useState } from "react";
import {
  imageStyle,
  type PropertyImage,
} from "@/lib/image-framing";

export interface GalleryProps {
  images: PropertyImage[];
  alt: string;
}

export const Gallery: React.FC<GalleryProps> = ({ images, alt }) => {
  const [mainIndex, setMainIndex] = useState(0);
  const mainImage = images[mainIndex] ?? images[0];
  const thumbnails = images.slice(0, 10);

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md md:aspect-square md:rounded-l-lg">
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={alt}
            className="h-full w-full"
            style={imageStyle(mainImage)}
          />
        ) : null}
      </div>

      <div className="hidden grid-cols-3 gap-2 md:grid">
        {thumbnails.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setMainIndex(index)}
            className={`relative aspect-square overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              index === mainIndex ? "ring-2 ring-ink" : ""
            }`}
            aria-label={`Ver foto ${index + 1}`}
            aria-current={index === mainIndex ? "true" : undefined}
          >
            <img
              src={image.url}
              alt={`${alt} - foto ${index + 1}`}
              className="h-full w-full transition-transform duration-300 hover:scale-105"
              style={imageStyle(image)}
            />
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto py-2 md:hidden">
        {thumbnails.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={() => setMainIndex(index)}
            className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${
              index === mainIndex ? "ring-2 ring-ink" : ""
            }`}
            aria-label={`Ver foto ${index + 1}`}
          >
            <img
              src={image.url}
              alt={`${alt} - foto ${index + 1}`}
              className="h-full w-full"
              style={imageStyle(image)}
            />
          </button>
        ))}
      </div>
    </div>
  );
};
