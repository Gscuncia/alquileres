import { prisma } from "@/lib/prisma";
import type { Property } from "@prisma/client";

export interface PropertyPublic {
  id: string;
  slug: string;
  title: string;
  location: string;
  shortDescription: string;
  images: string[];
}

export interface PropertyDetail extends PropertyPublic {
  description: string;
  amenities: string[];
  capacity: number;
  bedrooms: number;
  bathrooms: number;
}

function toPublic(property: Property): PropertyPublic {
  return {
    id: property.id,
    slug: property.slug,
    title: property.title,
    location: property.location,
    shortDescription: property.shortDescription,
    images: property.images,
  };
}

function toDetail(property: Property): PropertyDetail {
  return {
    ...toPublic(property),
    description: property.description,
    amenities: property.amenities,
    capacity: property.capacity,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
  };
}

export async function getPublishedProperties(): Promise<PropertyPublic[]> {
  try {
    const properties = await prisma.property.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
    });
    return properties.map(toPublic);
  } catch {
    // Empty/unreachable DB must never break the public homepage.
    return [];
  }
}

export async function getPropertyBySlug(
  slug: string,
): Promise<PropertyDetail | null> {
  let property: Property | null;
  try {
    property = await prisma.property.findUnique({
      where: { slug },
    });
  } catch {
    // An unreachable DB must degrade to "unknown slug" (404), never a 500.
    return null;
  }
  if (!property || !property.published) {
    return null;
  }
  return toDetail(property);
}

export async function getAllPropertiesForAdmin(): Promise<PropertyDetail[]> {
  const properties = await prisma.property.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return properties.map(toDetail);
}
