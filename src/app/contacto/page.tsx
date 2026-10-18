import type { Metadata } from "next";
import { ContactForm, Footer, TopNav } from "@/components/design-system";
import { getContactSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Contacto | Alquileres Anita",
  description:
    "Contactanos por WhatsApp o email para consultar por tu próximo alojamiento en San Clemente del Tuyú.",
};

export default async function ContactPage() {
  const { whatsappPhone } = await getContactSettings();
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
    "Hola, quiero consultar por un alojamiento",
  )}`;

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-display-xl font-bold text-ink">Contactanos</h1>
          <p className="mt-4 text-body-md text-body">
            Estamos para ayudarte a elegir el alojamiento ideal en San Clemente del Tuyú.
            Escribinos por WhatsApp o completá el formulario y te respondemos a la brevedad.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 text-button-md font-medium text-on-primary transition-colors hover:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Enviar WhatsApp
            </a>
          </div>

          <ContactForm whatsappUrl={whatsappUrl} />

          <div className="mt-6 rounded-lg border border-cream-line bg-cream p-6">
            <p className="text-body-md text-body">
              ¿No sabés qué hacer durante tu estadía? Mirá nuestra guía de San Clemente.
            </p>
            <a
              href="/que-hacer-en-san-clemente"
              className="mt-3 inline-flex items-center text-button-md font-medium text-primary underline-offset-2 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              Descubrí qué hacer en San Clemente del Tuyú
            </a>
          </div>
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
