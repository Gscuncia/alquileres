import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const ADMIN_EMAIL = "admin@alquileresanita.com.ar";
const ADMIN_PASSWORD = "admin123"; // Change after first login.

export async function seedAdmin(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: {
      email: ADMIN_EMAIL,
      name: "Administrador",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log(`Admin user ready: ${admin.email} (${admin.role})`);
}

// Unsplash URLs are whitelisted in next.config.mjs (images.unsplash.com only).
export async function seedProperties(prisma: PrismaClient) {
  const properties = [
    {
      slug: "depto-1",
      title: "Departamento luminoso frente al mar",
      location: "San Clemente del Tuyú, Buenos Aires",
      shortDescription:
        "Moderno departamento a una cuadra de la playa, ideal para parejas",
      description:
        "Departamento luminoso de dos ambientes ubicado a una cuadra de la playa de San Clemente del Tuyú. Cuenta con una vista abierta y balcón, perfecto para desayunar mirando el mar.\n\nEstá completamente equipado para estadías temporarias: cocina completa, ropa de cama, Wi-Fi de alta velocidad y aire acondicionado frío/calor. Es ideal para parejas o viajeros que buscan comodidad y ubicación.",
      capacity: 2,
      bedrooms: 1,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Cocina equipada"],
      images: [
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80",
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
        "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80",
      ],
      published: true,
      sortOrder: 1,
    },
    {
      slug: "depto-2",
      title: "Departamento con balcón en el centro",
      location: "San Clemente del Tuyú, Buenos Aires",
      shortDescription: "Dos dormitorios a pasos del centro comercial",
      description:
        "Departamento en el centro de San Clemente del Tuyú, a pasos del centro comercial, restaurantes y de los principales atractivos de la ciudad. Su balcón francés da a la avenida principal.\n\nOfrece dos dormitorios, dos baños completos y un amplio living comedor. Incluye cocina equipada, Wi-Fi, TV y ropa de cama. Capacidad para cuatro personas.",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 2,
      amenities: ["Wi-Fi", "Cocina equipada"],
      images: [
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&q=80",
        "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80",
      ],
      published: true,
      sortOrder: 2,
    },
    {
      slug: "casita",
      title: "Casita con patio y parrilla",
      location: "San Clemente del Tuyú, Buenos Aires",
      shortDescription: "Casa reciclada con patio y parrilla, ideal para familias",
      description:
        "Casita de una planta reciclada con criterio de diseño, en un barrio tranquilo de San Clemente del Tuyú. El patio trasero con parrilla es el lugar de encuentro para tardes de asado.\n\nCuenta con dos dormitorios, un baño, cocina completa y jardín con espacio para descansar. Es ideal para familias o grupos de amigos que quieren estar cerca del mar sin perder tranquilidad.",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Cocina equipada"],
      images: [
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
        "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&q=80",
        "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
      ],
      published: true,
      sortOrder: 3,
    },
    {
      slug: "chalet",
      title: "Chalet amplio a cinco cuadras del mar",
      location: "San Clemente del Tuyú, Buenos Aires",
      shortDescription: "Chalet de tres dormitorios con jardín y cochera",
      description:
        "Chalet de estilo marplatense a solo cinco cuadras de la playa de San Clemente del Tuyú y a pocas del centro comercial de la ciudad. Perfecto para una estadía de verano en familia o con amigos.\n\nEl alojamiento tiene tres dormitorios, dos baños, living comedor amplio, cocina totalmente equipada y un jardín con parrilla para disfrutar las noches de verano. Incluye ropa de cama y cochera cubierta.",
      capacity: 6,
      bedrooms: 3,
      bathrooms: 2,
      amenities: ["Wi-Fi", "Cocina equipada"],
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
        "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80",
        "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80",
      ],
      published: true,
      sortOrder: 4,
    },
  ];

  for (const property of properties) {
    const { slug, ...data } = property;
    const created = await prisma.property.upsert({
      where: { slug },
      update: {},
      create: { slug, ...data },
    });
    console.log(`Property ready: ${created.slug}`);
  }
}

export async function seedRecipients(prisma: PrismaClient) {
  const sonia = await prisma.transferRecipient.upsert({
    where: { name: "Sonia" },
    update: {},
    create: { name: "Sonia" },
  });

  console.log(`Transfer recipient ready: ${sonia.name}`);
}

export async function seed(prisma: PrismaClient) {
  // Each seed section is idempotent independently; no early global return.
  await seedAdmin(prisma);
  await seedProperties(prisma);
  await seedRecipients(prisma);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule =
  process.argv.length > 1 &&
  path.resolve(fileURLToPath(import.meta.url)) ===
    path.resolve(process.argv[1]);

if (isMainModule) {
  main().catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
}
