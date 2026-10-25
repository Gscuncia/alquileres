import type { Metadata } from "next";
import Link from "next/link";
import { Footer, TopNav } from "@/components/design-system";
import { getWhatToDoContent } from "@/lib/site-content";
import { imageStyle } from "@/lib/image-framing";

export const metadata: Metadata = {
  title: "¿Qué hacer en San Clemente del Tuyú? | Alquileres Anita",
  description:
    "Descubrí qué hacer en San Clemente del Tuyú: playas, termas, gastronomía, actividades al aire libre y paseos por ciudades vecinas.",
};

export default async function WhatToDoPage() {
  const content = await getWhatToDoContent();

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-bold text-ink">
            ¿Qué hacer en San Clemente del Tuyú?
          </h1>
          <p className="mt-4 text-body-md text-body">{content.intro}</p>
        </div>

        <section className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {content.cards.map((card) => (
            <article
              key={card.title}
              className="group overflow-hidden rounded-md bg-surface-card shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={card.image.url}
                  alt={card.title}
                  style={imageStyle(card.image)}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h2 className="text-title-md font-semibold text-ink">
                  {card.title}
                </h2>
                <p className="mt-2 text-body-sm text-body">
                  {card.description}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-14 rounded-lg border border-cream-line bg-header-bg p-8 text-center md:p-10">
          <h2 className="text-display-lg font-semibold text-ink">
            ¿Listo para vivir San Clemente?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-body-md text-body">
            Tenemos el alojamiento ideal para que disfrutes cada uno de estos planes.
            Escribinos y te ayudamos a elegir la mejor opción.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contacto"
              className="inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 text-button-md font-medium text-on-primary transition-colors hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Contactanos
            </Link>
            <Link
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-sm border border-ink bg-canvas px-6 text-button-md font-medium text-ink transition-colors hover:bg-surface-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Ver alojamientos
            </Link>
          </div>
        </section>
      </main>

      <Footer
        legal={{
          copyright: "© 2026 Alquileres Anita",
          links: [
            { label: "Acceso", href: "/auth/signin" },
            { label: "Privacidad" },
            { label: "Términos" },
            { label: "Mapa del sitio" },
          ],
        }}
      />
    </div>
  );
}
