import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer, TopNav } from "@/components/design-system";

export const metadata: Metadata = {
  title: "¿Qué hacer en San Clemente del Tuyú? | Alquileres Anita",
  description:
    "Descubrí qué hacer en San Clemente del Tuyú: playas, termas, gastronomía, actividades al aire libre y paseos por ciudades vecinas.",
};

const attractions = [
  {
    title: "Playa de San Clemente",
    description:
      "Arena dorada y aguas tranquilas ideales para familias. Disfrutá de tardes de mates, paseos por la orilla y atardeceres inolvidables frente al mar.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Playa amplia con arena dorada y mar tranquilo",
  },
  {
    title: "Termas Marinas",
    description:
      "Relajate en aguas termales con vista al mar. Un plan perfecto para desconectar, cuidar el cuerpo y disfrutar de un día de bienestar.",
    image:
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Piletas de aguas termales al aire libre",
  },
  {
    title: "Paseo de compras y centro comercial",
    description:
      "Recorré las principales avenidas con negocios de artesanías, indumentaria y souvenirs. Encontrá todo lo que necesitás para tus vacaciones.",
    image:
      "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Calle comercial con negocios y gente paseando",
  },
  {
    title: "Gastronomía local",
    description:
      "Saboreá mariscos frescos, parrillas tradicionales y las clásicas opciones de la costa. Un viaje por los sabores de San Clemente no puede faltar.",
    image:
      "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Plato de mariscos frescos servido en restaurante",
  },
  {
    title: "Actividades al aire libre",
    description:
      "Paseos en cuatriciclo por la playa, salidas de pesca, senderismo y avistaje de aves. La naturaleza de la zona ofrece planes para todos los niveles.",
    image:
      "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Cuatriciclo sobre arena con paisaje costero",
  },
  {
    title: "Ciudades vecinas",
    description:
      "San Clemente es punto de partida ideal para conocer Las Toninas, Santa Teresita y otras localidades de la costa, cada una con su propio encanto.",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
    imageAlt: "Vista aérea de la costa con mar y ciudad",
  },
];

export default function WhatToDoPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-bold text-ink">
            ¿Qué hacer en San Clemente del Tuyú?
          </h1>
          <p className="mt-4 text-body-md text-body">
            San Clemente del Tuyú combina playa, naturaleza y relax. Ya sea que busques
            descansar en la arena, disfrutar de las termas o recorrer la costa, acá
            encontrás los mejores planes para vivir tu estadía al máximo.
          </p>
        </div>

        <section className="mt-10 grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {attractions.map((attraction) => (
            <article
              key={attraction.title}
              className="group overflow-hidden rounded-md bg-surface-card shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={attraction.image}
                  alt={attraction.imageAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1128px) 50vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h2 className="text-title-md font-semibold text-ink">
                  {attraction.title}
                </h2>
                <p className="mt-2 text-body-sm text-body">
                  {attraction.description}
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
            { label: "Privacidad" },
            { label: "Términos" },
            { label: "Mapa del sitio" },
          ],
        }}
      />
    </div>
  );
}
