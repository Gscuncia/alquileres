"use client";

import React from "react";
import { HeartIcon, MenuIcon, SearchIcon, StarIcon, UserIcon } from "./icons";

export type IconName = "heart" | "search" | "star" | "menu" | "user";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: "circle" | "outline" | "overlay";
  pressed?: boolean;
}

const iconMap: Record<IconName, React.FC<{ className?: string; filled?: boolean }>> = {
  heart: HeartIcon,
  search: SearchIcon,
  star: StarIcon,
  menu: MenuIcon,
  user: UserIcon,
};

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  variant = "circle",
  pressed = false,
  className = "",
  ...rest
}) => {
  const Icon = iconMap[icon];

  const styles: Record<string, string> = {
    circle:
      "h-8 w-8 rounded-full bg-surface-strong text-ink hover:bg-hairline-soft",
    outline:
      "h-10 w-10 rounded-full border border-hairline bg-canvas text-ink hover:border-ink",
    overlay:
      "h-8 w-8 rounded-full bg-white/80 text-ink backdrop-blur-sm hover:bg-white",
  };

  const isHeart = icon === "heart";

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isHeart ? pressed : undefined}
      className={`inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink ${styles[variant]} ${className}`}
      {...rest}
    >
      <Icon
        className={`h-5 w-5 ${isHeart && pressed ? "text-primary" : ""}`}
        filled={isHeart && pressed}
      />
    </button>
  );
};
