import React from "react";

export interface FooterLink {
  label: string;
  href?: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterLegal {
  copyright: string;
  links: FooterLink[];
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    title: "Alquileres Anita",
    links: [
      { label: "Quiénes somos", href: "/quienes-somos" },
      { label: "¿Dónde estamos?", href: "/donde-estamos" },
      { label: "¿Qué hacer en San Clemente?", href: "/que-hacer-en-san-clemente" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
];

export interface FooterProps {
  columns?: FooterColumn[];
  legal?: FooterLegal | false;
}

export const Footer: React.FC<FooterProps> = ({ columns = DEFAULT_COLUMNS, legal }) => {
  return (
    <footer className="border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-title-sm font-medium text-ink">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href ?? "#"}
                      className="text-body-sm text-ink transition-colors hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {legal && (
          <>
            <div className="my-8 h-px bg-hairline" aria-hidden="true" />
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <p className="text-body-sm text-ink">{legal.copyright}</p>
              <nav aria-label="Legal" className="flex flex-wrap gap-4">
                {legal.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href ?? "#"}
                    className="text-body-sm text-legal-link underline transition-colors hover:text-ink"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </>
        )}
      </div>
    </footer>
  );
};
