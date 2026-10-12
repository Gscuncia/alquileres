import { notFound } from "next/navigation";
import Link from "next/link";
import {
  TopNav,
  Footer,
  AmenityIcon,
  Button,
} from "@/components/design-system";
import { Gallery } from "@/components/property/Gallery";
import { ContactCard } from "@/components/property/ContactCard";
import { getAllPropertiesForAdmin, getPropertyBySlug } from "@/lib/properties-db";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const properties = await getAllPropertiesForAdmin();
    return properties.map((property) => ({ slug: property.slug }));
  } catch {
    // Build must succeed without a database; slugs render on demand.
    return [];
  }
}

interface PropertyPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PropertyPageProps) {
  const property = await getPropertyBySlug(params.slug);
  if (!property) {
    return { title: "Alojamiento no encontrado | Alquileres Anita" };
  }
  return {
    title: `${property.title} | Alquileres Anita`,
    description: property.shortDescription,
  };
}

export default async function PropertyPage({ params }: PropertyPageProps) {
  const property = await getPropertyBySlug(params.slug);

  if (!property) {
    notFound();
  }

  const paragraphs = property.description.split("\n\n");

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-6 md:px-6 lg:py-8">
        <div className="mb-4">
          <Button asChild variant="ghost" className="px-0">
            <Link href="/">← Volver</Link>
          </Button>
        </div>

        <h1 className="text-display-xl font-bold text-ink">{property.title}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-body-sm text-ink">
          <span>{property.location}</span>
          <span>·</span>
          <span>
            {property.capacity} huéspedes · {property.bedrooms} dormitorios ·{" "}
            {property.bathrooms} baños
          </span>
        </div>

        <div className="mt-6">
          <Gallery images={property.images} alt={property.title} />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <section>
              <h2 className="text-display-md font-bold text-ink">
                Acerca de este alojamiento
              </h2>
              <div className="mt-4 space-y-4">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-body-md text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className="mt-8 border-t border-hairline pt-8">
              <h2 className="text-display-md font-bold text-ink">
                Qué ofrece este lugar
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {property.amenities.map((amenity) => (
                  <AmenityIcon key={amenity} label={amenity} />
                ))}
              </div>
            </section>
          </div>

          <aside className="hidden lg:sticky lg:top-6 lg:self-start lg:block">
            <ContactCard propertyTitle={property.title} />
          </aside>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-hairline bg-canvas p-4 shadow-card lg:hidden">
        <ContactCard propertyTitle={property.title} />
      </div>

      <div className="pb-24 lg:pb-0">
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
    </div>
  );
}
