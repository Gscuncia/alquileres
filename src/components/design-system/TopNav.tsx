"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./Button";

export interface TopNavProps {
  logoSrc?: string;
  brandName?: string;
  homeHref?: string;
}

const navItems = [
  { href: "/", label: "Alojamiento" },
  { href: "/quienes-somos", label: "Quienes somos" },
  { href: "/donde-estamos", label: "¿Dónde estamos?" },
  { href: "/que-hacer-en-san-clemente", label: "¿Qué hacer en San Clemente del Tuyú?" },
  { href: "/contacto", label: "Contacto" },
];

export const TopNav: React.FC<TopNavProps> = ({
  logoSrc = "/logo.svg",
  brandName = "Alquileres Anita",
  homeHref = "/",
}) => {
  const pathname = usePathname();

  return (
    <header className="relative overflow-hidden border-b border-cream-line bg-header-bg shadow-sm">
      {/* Decorative seaside motif */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.08]"
        aria-hidden="true"
      >
        <svg
          className="absolute -right-8 -top-10 h-48 w-48 text-primary md:h-64 md:w-64"
          viewBox="0 0 120 120"
          fill="currentColor"
        >
          <circle cx="60" cy="60" r="50" />
          <circle cx="60" cy="60" r="38" fill="#fff9ed" />
          <circle cx="60" cy="60" r="26" />
          <circle cx="60" cy="60" r="14" fill="#fff9ed" />
          <circle cx="60" cy="60" r="6" />
          <path d="M60 0 Q65 8 60 16 Q55 8 60 0" className="text-sky" fill="currentColor" />
          <path d="M60 104 Q65 112 60 120 Q55 112 60 104" className="text-sky" fill="currentColor" />
          <path d="M0 60 Q8 65 16 60 Q8 55 0 60" className="text-sky" fill="currentColor" />
          <path d="M104 60 Q112 65 120 60 Q112 55 104 60" className="text-sky" fill="currentColor" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 h-24 w-full text-sky"
          preserveAspectRatio="none"
          viewBox="0 0 1440 96"
          fill="currentColor"
        >
          <path d="M0 64 C240 96 480 32 720 64 C960 96 1200 32 1440 64 V96 H0 Z" />
          <path
            d="M0 80 C360 48 720 112 1080 80 C1260 64 1350 72 1440 80 V96 H0 Z"
            className="text-primary opacity-50"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="relative mx-auto max-w-[1440px] px-4 md:px-6">
        {/* Main bar: logo + centered tagline */}
        <div className="grid h-auto grid-cols-[auto_1fr_auto] items-center gap-4 py-5 md:py-6">
          {/* Logo */}
          <Link href={homeHref} className="flex shrink-0 items-center">
            <Image
              src={logoSrc}
              alt={brandName}
              width={200}
              height={100}
              className="h-16 w-auto md:h-20"
              priority
            />
          </Link>

          {/* Centered tagline */}
          <div className="flex min-w-0 flex-col items-center justify-center px-2 text-center">
            <span className="text-display-md font-semibold italic text-ink md:text-display-lg lg:text-display-xl">
              Alojamiento en San Clemente del Tuyú
            </span>
            <span className="mt-2 h-1 w-16 rounded-full bg-primary md:w-20" aria-hidden="true" />
          </div>

          {/* Login button in the top-right corner */}
          <div className="hidden md:block">
            <Button asChild variant="primary">
              <Link href="/auth/signin">Login</Link>
            </Button>
          </div>
        </div>

        {/* Navigation row */}
        <nav
          aria-label="Navegación principal"
          className="flex flex-wrap items-center justify-center gap-1 pb-3 md:gap-2"
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative whitespace-nowrap rounded-sm px-3 py-2 text-caption transition-all md:text-nav-link ${
                  isActive
                    ? "font-semibold text-ink after:absolute after:bottom-0 after:left-3 after:right-3 after:h-[3px] after:rounded-full after:bg-primary"
                    : "font-medium text-muted hover:bg-cream-strong hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
