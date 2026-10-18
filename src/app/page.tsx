import Link from "next/link";
import {
  Footer,
  GoogleReviews,
  MapEmbed,
  PropertyCard,
  TopNav,
} from "@/components/design-system";
import { getLocationContent } from "@/lib/site-content";
import { getPublishedProperties } from "@/lib/properties-db";
import { imageStyle } from "@/lib/image-framing";

const GOOGLE_REVIEWS_URL =
  "https://www.google.com/travel/search?q=alquileres%20anita%20google&g2lb=4965990%2C72471280%2C72573224%2C72647020%2C72686036%2C72803964%2C72882230%2C73064764%2C121529350%2C121608706%2C121738283%2C121762713%2C121921501%2C121951222%2C122078727%2C122093071&hl=es-419&gl=ar&ssta=1&ts=CAEaKwopEicyJTB4OTU5YzFiNWZiYjcxNDRlNToweGZlMzM4Y2M5N2M5ZjJmOTc&qs=CAEyFENnc0lsOV84NUplWjQ1bi1BUkFCOAI&ap=ugEHcmV2aWV3cw&ictx=111&ved=0CAAQ5JsGahcKEwiQsOOMuLSXAxUAAAAAHQAAAAAQCg";

export default async function LandingPage() {
  const [properties, locationContent] = await Promise.all([
    getPublishedProperties(),
    getLocationContent(),
  ]);
  const locationAddress = locationContent.address;

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1440px] px-4 py-8 md:px-6 lg:py-section">
        <section>
          <div className="mb-4">
            <h2 className="text-display-md font-bold text-ink">
              Elegí tu próximo alojamiento
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => {
              const firstImage = property.images[0];
              return (
                <PropertyCard
                  key={property.id}
                  href={`/propiedades/${property.slug}`}
                  title={property.location}
                  image={firstImage?.url ?? ""}
                  imageStyle={firstImage ? imageStyle(firstImage) : undefined}
                  imageAlt={property.title}
                  lines={[property.title, property.shortDescription]}
                />
              );
            })}
          </div>
        </section>
      </main>

      <GoogleReviews
        rating={4.7}
        reviewCount={43}
        profileUrl={GOOGLE_REVIEWS_URL}
        reviews={[
          {
            author: "Veronica Itze",
            text: "Volveremos y lo recomendamos",
          },
          {
            author: "Veronica Rodriguez",
            text: "Excelente lugar y los propietarios muy amables .. todo muy bueno.",
          },
          {
            author: "Huésped de Google",
            text: "Muy lindo lugar, muy limpio y cómodo. La atención es excelente.",
          },
        ]}
      />

      <section className="border-y border-hairline bg-surface-soft py-10 md:py-14">
        <div className="mx-auto max-w-[1128px] px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2 md:gap-8">
            <div className="overflow-hidden rounded-lg shadow-card">
              <MapEmbed className="aspect-video w-full" />
            </div>
            <div>
              <h2 className="text-display-lg font-bold text-ink">¿Dónde estamos?</h2>
              <p className="mt-3 text-body-md text-body">{locationAddress}</p>
              <Link
                href="/donde-estamos"
                className="mt-4 inline-flex items-center text-button-md font-medium text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              >
                Ver ubicación completa
              </Link>
            </div>
          </div>
        </div>
      </section>

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
