import { prisma } from "@/lib/prisma";
import {
  normalizeImage,
  normalizeImages,
  type PropertyImage,
} from "@/lib/image-framing";

/** Row keys used by `SiteContent.page` (kept in one place for actions). */
export const ABOUT_PAGE = "quienes-somos";
export const WHAT_TO_DO_PAGE = "que-hacer";

export interface AboutContent {
  intro: string;
  paragraphs: string[];
  images: PropertyImage[];
}

export interface AttractionCard {
  title: string;
  description: string;
  image: PropertyImage;
}

export interface WhatToDoContent {
  intro: string;
  cards: AttractionCard[];
}

/** The content shipped with the original hardcoded pages. */
export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  intro: "Una familia que abre las puertas de su hogar en la costa",
  paragraphs: [
    "Alquileres Anita nació hace más de quince años, casi sin querer, cuando decidimos alquilar por primera vez nuestra casa de veraneo en San Clemente del Tuyú. Lo que empezó como una forma de compartir un lugar que amamos se transformó en lo que hoy es nuestra pasión: recibir familias, parejas y grupos de amigos para que se lleven el mejor recuerdo de la costa atlántica.",
    "Cada propiedad que administramos fue elegida con el mismo cuidado con el que cuidamos nuestro propio hogar. Nos encanta el olor a pino y mar de San Clemente, los mates al atardecer en la vereda y las charlas con vecinos que ya se sienten familia. Esa calidez es lo que intentamos transmitir en cada estadía, desde el primer mensaje hasta el día de la despedida.",
    "Hoy seguimos siendo una empresa familiar, atendida por nosotros mismos, con la misma ilusión del primer verano. Si elegís quedarte con nosotros, vas a encontrar atención personalizada, recomendaciones locales y ganas reales de que tu viaje sea inolvidable. Bienvenidos a Alquileres Anita, bienvenidos a nuestra casa.",
  ],
  images: [
    {
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      fit: "cover",
      x: 50,
      y: 50,
      zoom: 1,
    },
  ],
};

/** The attractions array of the original hardcoded page. */
export const DEFAULT_WHATTODO_CONTENT: WhatToDoContent = {
  intro:
    "San Clemente del Tuyú combina playa, naturaleza y relax. Ya sea que busques descansar en la arena, disfrutar de las termas o recorrer la costa, acá encontrás los mejores planes para vivir tu estadía al máximo.",
  cards: [
    {
      title: "Playa de San Clemente",
      description:
        "Arena dorada y aguas tranquilas ideales para familias. Disfrutá de tardes de mates, paseos por la orilla y atardeceres inolvidables frente al mar.",
      image: {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    {
      title: "Termas Marinas",
      description:
        "Relajate en aguas termales con vista al mar. Un plan perfecto para desconectar, cuidar el cuerpo y disfrutar de un día de bienestar.",
      image: {
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    {
      title: "Paseo de compras y centro comercial",
      description:
        "Recorré las principales avenidas con negocios de artesanías, indumentaria y souvenirs. Encontrá todo lo que necesitás para tus vacaciones.",
      image: {
        url: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    {
      title: "Gastronomía local",
      description:
        "Saboreá mariscos frescos, parrillas tradicionales y las clásicas opciones de la costa. Un viaje por los sabores de San Clemente no puede faltar.",
      image: {
        url: "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    {
      title: "Actividades al aire libre",
      description:
        "Paseos en cuatriciclo por la playa, salidas de pesca, senderismo y avistaje de aves. La naturaleza de la zona ofrece planes para todos los niveles.",
      image: {
        url: "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
    {
      title: "Ciudades vecinas",
      description:
        "San Clemente es punto de partida ideal para conocer Las Toninas, Santa Teresita y otras localidades de la costa, cada una con su propio encanto.",
      image: {
        url: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
        fit: "cover",
        x: 50,
        y: 50,
        zoom: 1,
      },
    },
  ],
};

/** Body text stores whole paragraphs separated by a blank line. */
function parseParagraphs(body: string): string[] {
  return body
    .split("\n\n")
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** Tolerant card parser: drops entries with empty title or unusable image. */
function parseCards(raw: unknown): AttractionCard[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const cards: AttractionCard[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      continue;
    }
    const candidate = entry as {
      title?: unknown;
      description?: unknown;
      image?: unknown;
    };
    if (typeof candidate.title !== "string" || candidate.title.trim() === "") {
      continue;
    }
    const image = normalizeImage(candidate.image ?? entry);
    if (image === null) {
      continue;
    }
    cards.push({
      title: candidate.title.trim(),
      description:
        typeof candidate.description === "string" ? candidate.description : "",
      image,
    });
  }
  return cards;
}

function readIntro(raw: unknown, fallback: string): string {
  return typeof raw === "string" ? raw : fallback;
}

/** Public reader for «Quienes somos»: DB row, falling back to the defaults. */
export async function getAboutContent(): Promise<AboutContent> {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { page: ABOUT_PAGE },
    });
    if (!row) {
      return DEFAULT_ABOUT_CONTENT;
    }
    return {
      intro: readIntro(row.intro, DEFAULT_ABOUT_CONTENT.intro),
      paragraphs: parseParagraphs(row.body),
      images: normalizeImages(row.images),
    };
  } catch {
    return DEFAULT_ABOUT_CONTENT;
  }
}

/** Public reader for «¿Qué hacer…?»: DB row, falling back to the defaults. */
export async function getWhatToDoContent(): Promise<WhatToDoContent> {
  try {
    const row = await prisma.siteContent.findUnique({
      where: { page: WHAT_TO_DO_PAGE },
    });
    if (!row) {
      return DEFAULT_WHATTODO_CONTENT;
    }
    return {
      intro: readIntro(row.intro, DEFAULT_WHATTODO_CONTENT.intro),
      cards: parseCards(row.cards),
    };
  } catch {
    return DEFAULT_WHATTODO_CONTENT;
  }
}
