"use client";

import React, { useState } from "react";

export interface CategoryItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CategoryStripProps {
  items: CategoryItem[];
  active?: string;
  onChange?: (id: string) => void;
  tone?: "header" | "default";
}

export const CategoryStrip: React.FC<CategoryStripProps> = ({
  items,
  active: activeProp,
  onChange,
  tone = "default",
}) => {
  const [internalActive, setInternalActive] = useState(
    activeProp ?? (items[0]?.id || ""),
  );
  const active = activeProp ?? internalActive;

  const handleClick = (id: string) => {
    if (onChange) {
      onChange(id);
    } else {
      setInternalActive(id);
    }
  };

  return (
    <div
      className={`${tone === "header" ? "bg-header-bg" : "bg-canvas"} -mx-4 px-4 md:mx-0 md:px-0`}
    >
      <nav
        aria-label="Categorías"
        className="flex gap-6 overflow-x-auto py-3 md:gap-8"
      >
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleClick(item.id)}
              className={`group flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 transition-colors ${
                isActive
                  ? "border-ink text-ink"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {item.icon && <span className="h-6 w-6">{item.icon}</span>}
              <span className="whitespace-nowrap text-button-sm font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
