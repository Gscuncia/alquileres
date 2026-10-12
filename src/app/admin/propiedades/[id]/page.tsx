import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { updateProperty } from "@/app/admin/properties/actions";
import { PropertyForm } from "@/components/admin/PropertyForm";

interface EditPropertyPageProps {
  params: { id: string };
}

export default async function EditPropertyPage({
  params,
}: EditPropertyPageProps) {
  await requireAdmin();

  const property = await prisma.property.findUnique({
    where: { id: params.id },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/propiedades"
          className="text-button-sm text-ink underline-offset-2 hover:underline"
        >
          ← Volver a propiedades
        </Link>
        <h2 className="mt-2 text-display-sm font-semibold text-ink">
          Editar: {property.title}
        </h2>
        <p className="mt-1 text-caption-sm text-muted">
          <a
            href={`/propiedades/${property.slug}`}
            className="underline-offset-2 hover:underline"
          >
            Ver página pública
          </a>
        </p>
      </div>
      <PropertyForm
        action={updateProperty}
        initialValues={{
          id: property.id,
          title: property.title,
          slug: property.slug,
          location: property.location,
          shortDescription: property.shortDescription,
          description: property.description,
          capacity: String(property.capacity),
          bedrooms: String(property.bedrooms),
          bathrooms: String(property.bathrooms),
          amenities: property.amenities,
          images: property.images,
          published: property.published,
          sortOrder: String(property.sortOrder),
        }}
        submitLabel="Guardar cambios"
      />
    </div>
  );
}
