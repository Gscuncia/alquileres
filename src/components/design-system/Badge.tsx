import React from "react";

export interface BadgeProps {
  tone: "favorite" | "new";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ tone, children }) => {
  if (tone === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-sky px-2 py-0.5 text-uppercase-tag font-bold uppercase text-ink">
        {children}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-canvas px-3 py-1.5 text-badge font-semibold text-ink shadow-card">
      {children}
    </span>
  );
};
