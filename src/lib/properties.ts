export interface PropertyHost {
  name: string;
  email: string;
}

export interface Property {
  id: string;
  title: string;
  location: string;
  shortDescription: string;
  description: string[];
  rating: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  images: string[];
  host: PropertyHost;
}

const imagePool: string[] = [
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80",
  "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80",
  "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80",
  "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800&q=80",
  "https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?w=800&q=80",
  "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80",
  "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800&q=80",
  "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80",
  "https://images.unsplash.com/photo-1600566752229-250ed79470f8?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=800&q=80",
  "https://images.unsplash.com/photo-1600210491369-e753d80a41f3?w=800&q=80",
  "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80",
  "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=800&q=80",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=80",
  "https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?w=800&q=80",
];

function pickImages(startIndex: number, count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(imagePool[(startIndex + i) % imagePool.length]);
  }
  return result;
}

export const properties: Property[] = [
  {
    id: "palermo-soho-terraza",
    title: "Departamento luminoso en Palermo",
    location: "Palermo Soho, Buenos Aires",
    shortDescription: "Moderno departamento con terraza y vista abierta",
    description: [
      "Este luminoso departamento de dos ambientes se encuentra en el corazón de Palermo Soho, a metros de plazas, restaurantes y tiendas de diseño. Cuenta con una terraza propia ideal para desayunar o tomar algo al aire libre.",
      "El espacio está completamente equipado para estadías temporarias: cocina completa, ropa de blanca, Wi-Fi de alta velocidad y aire acondicionado frío/calor en todos los ambientes. Es perfecto para parejas o viajeros de negocios.",
    ],
    rating: "4,92",
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Aire acondicionado",
      "TV",
      "Lavarropas",
      "Terraza",
      "Ropa de cama",
      "Ascensor",
    ],
    images: pickImages(0, 5),
    host: {
      name: "Anita",
      email: "anita@alquileresanita.com.ar",
    },
  },
  {
    id: "san-telmo-loft-casona",
    title: "Loft en casona antigua de San Telmo",
    location: "San Telmo, Buenos Aires",
    shortDescription: "Loft con techos altos y patio compartido",
    description: [
      "Ubicado en una casona restaurada de principios de siglo XX, este loft conserva pisos originales, techos deyeso y aberturas antiguas que le dan un carácter único. El patio interno es compartido con otros dos departamentos.",
      "A pocas cuadras de la Plaza Dorrego y del mercado de San Telmo, es el punto de partida ideal para recorrer ferias de artesanías, milongas y cafés históricos. Incluye cocina equipada, Wi-Fi y calefacción.",
    ],
    rating: "4,81",
    capacity: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Calefacción",
      "TV",
      "Patio",
      "Ropa de cama",
      "Lavarropas",
    ],
    images: pickImages(5, 5),
    host: {
      name: "Martín",
      email: "martin@alquileresanita.com.ar",
    },
  },
  {
    id: "recoleta-balcon-frances",
    title: "Piso elegante con balcón francés",
    location: "Recoleta, Buenos Aires",
    shortDescription: "Clásico departamento en edificio francés",
    description: [
      "Elegante piso de estilo francés en una de las zonas más residenciales de Buenos Aires. El balcón a la calle permite disfrutar de la arquitectura del barrio mientras se toma un café.",
      "El departamento tiene capacidad para cuatro personas, con dos dormitorios, dos baños completos y un amplio living comedor. Está a diez minutos caminando del Cementerio de la Recoleta y los principales museos.",
    ],
    rating: "4,95",
    capacity: 4,
    bedrooms: 2,
    bathrooms: 2,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Aire acondicionado",
      "TV",
      "Lavarropas",
      "Balcón",
      "Ascensor",
      "Ropa de cama",
      "Estacionamiento",
    ],
    images: pickImages(10, 5),
    host: {
      name: "Carolina",
      email: "carolina@alquileresanita.com.ar",
    },
  },
  {
    id: "colegiales-casa-parrilla",
    title: "Casa con patio y parrilla en Colegiales",
    location: "Colegiales, Buenos Aires",
    shortDescription: "Casa reciclada con jardín y parrilla",
    description: [
      "Casa de dos plantas reciclada con criterio de diseño, que conserva detalles originales y suma comodidades modernas. El patio trasero con parrilla es el lugar de encuentro para tardes de asado.",
      "Cuenta con tres dormitorios, dos baños, cocina completa y espacio de trabajo. Es ideal para familias o grupos de amigos que quieren estar en un barrio tranquilo pero bien conectado.",
    ],
    rating: "4,78",
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Aire acondicionado",
      "TV",
      "Lavarropas",
      "Parrilla",
      "Jardín",
      "Ropa de cama",
      "Estacionamiento",
    ],
    images: pickImages(15, 5),
    host: {
      name: "Diego",
      email: "diego@alquileresanita.com.ar",
    },
  },
  {
    id: "mar-del-plata-cerca-del-mar",
    title: "Casa de playa en Mar del Plata",
    location: "Mar del Plata, Buenos Aires",
    shortDescription: "Casa luminosa a cinco cuadras del mar",
    description: [
      "Casa de estilo marplatense a solo cinco cuadras de la playa y a pocas del centro comercial de la ciudad. Perfecta para una estadía de verano en familia o con amigos.",
      "El alojamiento tiene tres dormitorios, dos baños, living comedor amplio, cocina totalmente equipada y un patio con parrilla para disfrutar las noches de verano. Incluye ropa de cama y toallas.",
    ],
    rating: "4,88",
    capacity: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Aire acondicionado",
      "TV",
      "Lavarropas",
      "Parrilla",
      "Jardín",
      "Ropa de cama",
      "Estacionamiento",
    ],
    images: pickImages(20, 5),
    host: {
      name: "Lucía",
      email: "lucia@alquileresanita.com.ar",
    },
  },
  {
    id: "pinamar-casa-jardin",
    title: "Casa con jardín y pileta en Pinamar",
    location: "Pinamar, Buenos Aires",
    shortDescription: "Casa de verano con pileta y jardín privado",
    description: [
      "Moderna casa de verano ubicada en un barrio tranquilo de Pinamar, a minutos del centro y de las playas. El jardín privado con pileta es el protagonista de la propiedad.",
      "La casa cuenta con cuatro dormitorios, tres baños, cocina equipada, living comedor con salida al jardín y cochera cubierta. Ideal para dos familias que quieren compartir unas vacaciones en la Costa Atlántica.",
    ],
    rating: "4,96",
    capacity: 8,
    bedrooms: 4,
    bathrooms: 3,
    amenities: [
      "Wi-Fi",
      "Cocina equipada",
      "Aire acondicionado",
      "TV",
      "Lavarropas",
      "Parrilla",
      "Pileta",
      "Jardín",
      "Ropa de cama",
      "Estacionamiento",
    ],
    images: pickImages(23, 5),
    host: {
      name: "Sofía",
      email: "sofia@alquileresanita.com.ar",
    },
  },
];

export function getPropertyById(id: string): Property | undefined {
  return properties.find((property) => property.id === id);
}
