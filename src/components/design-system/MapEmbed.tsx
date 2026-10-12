import React from "react";
import { LOCATION_MAP_URL } from "@/lib/location";

export interface MapEmbedProps {
  className?: string;
}

export const MapEmbed: React.FC<MapEmbedProps> = ({
  className = "",
}) => {
  return (
    <iframe
      src={LOCATION_MAP_URL}
      title="Ubicación de Alquileres Anita"
      className={`border-0 ${className}`}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
};
