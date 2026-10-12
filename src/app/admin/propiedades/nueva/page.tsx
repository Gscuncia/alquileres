import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { createProperty } from "@/app/admin/properties/actions";
import {
  PropertyForm,
  EMPTY_PROPERTY_FORM,
} from "@/components/admin/PropertyForm";

export default async function NewPropertyPage() {
  await requireAdmin();

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
          Nueva propiedad
        </h2>
      </div>
      <PropertyForm
        action={createProperty}
        initialValues={EMPTY_PROPERTY_FORM}
        submitLabel="Crear propiedad"
      />
    </div>
  );
}
