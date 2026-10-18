import type { Metadata } from "next";
import { Footer, TopNav } from "@/components/design-system";
import { getAboutContent } from "@/lib/site-content";
import { imageStyle } from "@/lib/image-framing";

export const metadata: Metadata = {
  title: "Quienes somos | Alquileres Anita",
  description:
    "Conocé la historia de Alquileres Anita, familia de anfitriones en San Clemente del Tuyú.",
};

export default async function AboutPage() {
  const content = await getAboutContent();
  const cover = content.images[0];

  return (
    <div className="min-h-screen bg-canvas">
      <TopNav />

      <main className="mx-auto max-w-[1128px] px-4 py-8 md:px-6 lg:py-section">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-display-xl font-bold text-ink">Quienes somos</h1>
          <p className="mt-2 text-body-md text-muted">{content.intro}</p>
        </div>

        {cover && (
          <div className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-lg">
            <img
              src={cover.url}
              alt="Interior acogedor de una casa de playa"
              style={imageStyle(cover)}
              className="h-auto w-full"
            />
          </div>
        )}

        <div className="mx-auto mt-8 max-w-3xl space-y-6">
          {content.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-body-md text-body">
              {paragraph}
            </p>
          ))}
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
