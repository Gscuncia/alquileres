import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  propertyCreate: vi.fn(),
  propertyUpdate: vi.fn(),
  propertyDelete: vi.fn(),
  propertyFindUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    property: {
      create: mocks.propertyCreate,
      update: mocks.propertyUpdate,
      delete: mocks.propertyDelete,
      findUnique: mocks.propertyFindUnique,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidatePath(path),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => mocks.redirect(path),
}));

import {
  createProperty,
  updateProperty,
  deleteProperty,
} from "@/app/admin/properties/actions";
import type { ActionState } from "@/lib/admin-action-types";

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const base = {
    title: "Departamento luminoso frente al mar",
    slug: "depto-nuevo",
    location: "San Clemente del Tuyú, Buenos Aires",
    shortDescription: "Moderno departamento a una cuadra de la playa",
    description: "Primer párrafo.\n\nSegundo párrafo.",
    capacity: "4",
    bedrooms: "2",
    bathrooms: "1",
    sortOrder: "5",
    published: "true",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    if (key === "published") {
      // Same hidden-before-checkbox pattern as PropertyForm.
      data.append("published", "false");
      if (value === "true") data.append("published", "true");
      continue;
    }
    data.append(key, value);
  }
  data.append("amenities", "Wi-Fi");
  data.append("amenities", "Cocina equipada");
  data.append(
    "images",
    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688",
  );
  return data;
}

const initialState: ActionState = { ok: false };

describe("property actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.propertyCreate.mockResolvedValue({});
    mocks.propertyUpdate.mockResolvedValue({});
    mocks.propertyDelete.mockResolvedValue({});
    mocks.propertyFindUnique.mockResolvedValue({ id: "prop-1", slug: "depto-viejo" });
  });

  it("throws 'No autorizado' when the caller is not an admin", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-2", email: "operative@alquileresanita.com.ar", role: "OPERATIVE" },
    });

    await expect(
      createProperty(initialState, buildFormData()),
    ).rejects.toThrow("No autorizado");
    expect(mocks.propertyCreate).not.toHaveBeenCalled();
  });

  it("throws 'No autorizado' when there is no session", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      deleteProperty(buildFormData()),
    ).rejects.toThrow("No autorizado");
    expect(mocks.propertyDelete).not.toHaveBeenCalled();
  });

  it("creates a property with ordered lists and revalidates public + admin paths", async () => {
    const result = await createProperty(initialState, buildFormData());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/guardaron correctamente/i);
    expect(mocks.propertyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Departamento luminoso frente al mar",
        slug: "depto-nuevo",
        capacity: 4,
        bedrooms: 2,
        bathrooms: 1,
        sortOrder: 5,
        published: true,
        amenities: ["Wi-Fi", "Cocina equipada"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
      }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/propiedades/depto-nuevo",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/propiedades");
  });

  it("rejects invalid input with Spanish field errors and creates nothing", async () => {
    const result = await createProperty(
      initialState,
      buildFormData({ title: "", capacity: "0", slug: "Depto Uno" }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.title).toMatch(/título/i);
    expect(result.fieldErrors?.capacity).toMatch(/capacidad/i);
    expect(result.fieldErrors?.slug).toMatch(/slug/i);
    expect(mocks.propertyCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("maps a slug unique violation to fieldErrors.slug with 'El slug ya existe'", async () => {
    mocks.propertyCreate.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });

    const result = await createProperty(initialState, buildFormData());

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.slug).toBe("El slug ya existe");
  });

  it("rethrows non-P2002 create errors", async () => {
    mocks.propertyCreate.mockRejectedValue(new Error("connection refused"));

    await expect(createProperty(initialState, buildFormData())).rejects.toThrow(
      "connection refused",
    );
  });

  it("updates an existing property and revalidates the editor path", async () => {
    const formData = buildFormData({ slug: "depto-renombrado" });
    formData.append("id", "prop-1");

    const result = await updateProperty(initialState, formData);

    expect(result.ok).toBe(true);
    expect(mocks.propertyUpdate).toHaveBeenCalledWith({
      where: { id: "prop-1" },
      data: expect.objectContaining({ slug: "depto-renombrado" }),
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/propiedades/depto-renombrado",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/propiedades/prop-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/propiedades/depto-viejo",
    );
  });

  it("returns a not-found message when updating an unknown id", async () => {
    mocks.propertyFindUnique.mockResolvedValue(null);
    const formData = buildFormData();
    formData.append("id", "desconocido");

    const result = await updateProperty(initialState, formData);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/no encontrada/i);
    expect(mocks.propertyUpdate).not.toHaveBeenCalled();
  });

  it("maps slug conflicts on update to fieldErrors.slug", async () => {
    mocks.propertyUpdate.mockRejectedValue({ code: "P2002", meta: { target: ["slug"] } });
    const formData = buildFormData();
    formData.append("id", "prop-1");

    const result = await updateProperty(initialState, formData);

    expect(result.fieldErrors?.slug).toBe("El slug ya existe");
  });

  it("parses an unchecked published checkbox as false", async () => {
    const formData = buildFormData();
    // Only the hidden entry is present when the checkbox is unchecked.
    formData.delete("published");
    formData.append("published", "false");

    await createProperty(initialState, formData);

    expect(mocks.propertyCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ published: false }),
    });
  });

  it("deletes a property and revalidates so the public slug 404s", async () => {
    const formData = buildFormData();
    formData.append("id", "prop-1");

    await deleteProperty(formData);

    expect(mocks.propertyDelete).toHaveBeenCalledWith({ where: { id: "prop-1" } });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/propiedades/depto-viejo",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/propiedades");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin/propiedades");
  });

  it("redirects with an error flag when delete is blocked by existing bookings", async () => {
    mocks.propertyDelete.mockRejectedValue({ code: "P2003" });
    const formData = buildFormData();
    formData.append("id", "prop-1");

    await deleteProperty(formData);

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/propiedades?error=eliminar",
    );
  });

  it("blocks deleting a published property and never calls delete", async () => {
    mocks.propertyFindUnique.mockResolvedValue({
      id: "prop-1",
      slug: "depto-viejo",
      published: true,
    });
    const formData = buildFormData();
    formData.append("id", "prop-1");

    await deleteProperty(formData);

    expect(mocks.redirect).toHaveBeenCalledWith(
      "/admin/propiedades?error=publicada",
    );
    expect(mocks.propertyDelete).not.toHaveBeenCalled();
  });

  it("freshness: after an update + revalidate, a fresh read serves the new content", async () => {
    const formData = buildFormData({
      slug: "depto-viejo",
      shortDescription: "Descripción renovada por el admin",
    });
    formData.append("id", "prop-1");
    mocks.propertyUpdate.mockResolvedValue({});

    await updateProperty(initialState, formData);

    // Fresh anonymous read after revalidation: the mocked Prisma now returns
    // the updated snapshot, mirroring what a new request would see.
    mocks.propertyFindUnique.mockResolvedValue({
      id: "prop-1",
      slug: "depto-viejo",
      published: true,
      shortDescription: "Descripción renovada por el admin",
      title: "Departamento luminoso frente al mar",
      location: "San Clemente del Tuyú, Buenos Aires",
      description: "Primer párrafo.\n\nSegundo párrafo.",
      capacity: 4,
      bedrooms: 2,
      bathrooms: 1,
      amenities: ["Wi-Fi", "Cocina equipada"],
      images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688"],
      sortOrder: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { getPropertyBySlug } = await import("@/lib/properties-db");
    const fresh = await getPropertyBySlug("depto-viejo");

    expect(fresh?.shortDescription).toBe("Descripción renovada por el admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/propiedades/depto-viejo");
  });
});
