import React from "react";
import Link from "next/link";

export interface PropertyCardProps {
  title: string;
  image?: string;
  imageAlt?: string;
  lines?: string[];
  href?: string;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  title,
  image,
  imageAlt = title,
  lines = [],
  href,
}) => {
  const renderContent = () => (
    <>
      <div className="relative aspect-square overflow-hidden rounded-md bg-surface-strong">
        {image ? (
          <img
            src={image}
            alt={imageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="text-title-md text-ink">{title}</h3>

        {lines.map((line, i) => (
          <p key={i} className="text-body-sm text-muted">
            {line}
          </p>
        ))}
      </div>
    </>
  );

  return (
    <article className="group relative">
      {href ? (
        <Link href={href} className="block">
          {renderContent()}
        </Link>
      ) : (
        <>{renderContent()}</>
      )}
    </article>
  );
};
