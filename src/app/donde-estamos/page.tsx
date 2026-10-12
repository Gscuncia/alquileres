import type { Metadata } from "next";
import Link from "next/link";
import { Button, Footer, MapEmbed, TopNav } from "@/components/design-system";
import { LOCATION_ADDRESS } from "@/lib/location";

export const metadata: Metadata = {
  title: "¿Dónde estamos? | Alquileres Anita",
  description:
    "Encontrá a Alquileres Anita en San Clemente del Tuyú, a una cuadra del centro y a dos cuadras de la playa.",
};

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-bold text-ink">¿Dónde estamos?</h1>
          <p className="mt-4 text-body-md font-semibold text-ink">{LOCATION_ADDRESS}</p>
        </div>

        <div className="mt-8 overflow-hidden rounded-lg shadow-card">
          <MapEmbed className="h-96 w-full" />
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-4 text-body-md text-body">
          <p>
            Nuestras propiedades están ubicadas en una zona tranquila y accesible de San
            Clemente del Tuyú. Estar a una cuadra del centro significa tener cerca
            negocios, restaurantes y servicios, mientras que a solo dos cuadras de la
            playa podés disfrutar del mar en minutos.
          </p>
          <p>
            Es una ubicación ideal para quienes buscan comodidad sin renunciar al relax:
            accesos directos, calles arboladas y la posibilidad de dejar el auto y moverse
            caminando durante toda la estadía.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="primary">
            <Link href="/contacto">Contactanos</Link>
          </Button>
        </div>
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
