import type { Metadata } from "next";
import Image from "next/image";
import { Footer, TopNav } from "@/components/design-system";

export const metadata: Metadata = {
  title: "Quienes somos | Alquileres Anita",
  description:
    "Conocé la historia de Alquileres Anita, familia de anfitriones en San Clemente del Tuyú.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-bold text-ink">Quienes somos</h1>
          <p className="mt-2 text-body-md text-muted">
            Una familia que abre las puertas de su hogar en la costa
          </p>
        </div>

        <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-lg">
          <Image
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80"
            alt="Interior acogedor de una casa de playa"
            width={1200}
            height={675}
            className="h-auto w-full object-cover"
            priority
          />
        </div>

        <div className="mx-auto mt-8 max-w-3xl space-y-6">
          <p className="text-body-md text-body">
            Alquileres Anita nació hace más de quince años, casi sin querer, cuando decidimos
            alquilar por primera vez nuestra casa de veraneo en San Clemente del Tuyú. Lo que
            empezó como una forma de compartir un lugar que amamos se transformó en lo que hoy
            es nuestra pasión: recibir familias, parejas y grupos de amigos para que se lleven
            el mejor recuerdo de la costa atlántica.
          </p>

          <p className="text-body-md text-body">
            Cada propiedad que administramos fue elegida con el mismo cuidado con el que
            cuidamos nuestro propio hogar. Nos encanta el olor a pino y mar de San Clemente,
            los mates al atardecer en la vereda y las charlas con vecinos que ya se sienten
            familia. Esa calidez es lo que intentamos transmitir en cada estadía, desde el
            primer mensaje hasta el día de la despedida.
          </p>

          <p className="text-body-md text-body">
            Hoy seguimos siendo una empresa familiar, atendida por nosotros mismos, con la
            misma ilusión del primer verano. Si elegís quedarte con nosotros, vas a encontrar
            atención personalizada, recomendaciones locales y ganas reales de que tu viaje sea
            inolvidable. Bienvenidos a Alquileres Anita, bienvenidos a nuestra casa.
          </p>
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
