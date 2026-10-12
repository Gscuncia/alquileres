import React from "react";

export interface CityLinkItem {
  city: string;
  label: string;
  href?: string;
}

export interface CityLinksProps {
  items: CityLinkItem[];
}

export const CityLinks: React.FC<CityLinksProps> = ({ items }) => {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <a
          key={`${item.city}-${item.label}`}
          href={item.href ?? "#"}
          className="block transition-colors hover:text-primary"
        >
          <span className="block text-title-md text-ink">{item.city}</span>
          <span className="block text-body-sm text-muted">{item.label}</span>
        </a>
      ))}
    </div>
  );
};
