import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminForAction: vi.fn(),
  revalidatePath: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requireAdminForAction: () => mocks.requireAdminForAction(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContent: {
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mocks.revalidatePath(path),
}));

import {
  updateAboutContent,
  updateWhatToDoContent,
} from "@/app/admin/contexto/actions";
import type { ActionState } from "@/lib/admin-action-types";

const initialState: ActionState = { ok: false };

function buildFormData(entries: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      formData.append(key, item);
    }
  }
  return formData;
}

describe("contexto actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminForAction.mockResolvedValue({
      user: { id: "user-1", isDefaultAdmin: true },
    });
    mocks.upsert.mockResolvedValue({});
  });

  describe("authorization", () => {
    it("throws when the caller is not a default admin", async () => {
      mocks.requireAdminForAction.mockRejectedValue(new Error("No autorizado"));

      await expect(
        updateAboutContent(initialState, buildFormData({})),
      ).rejects.toThrow("No autorizado");
      await expect(
        updateWhatToDoContent(initialState, buildFormData({})),
      ).rejects.toThrow("No autorizado");

      expect(mocks.upsert).not.toHaveBeenCalled();
    });
  });

  describe("updateAboutContent", () => {
    it("upserts the quienes-somos row and revalidates both public pages", async () => {
      const formData = buildFormData({
        intro: "Una familia en la costa",
        body: "Párrafo uno.\n\nPárrafo dos.",
        images: [
          "https://drive.google.com/file/d/abc123defghij4567/view",
          "https://example.com/foto.jpg",
        ],
        imageFit: ["contain", "cover"],
        imageX: ["10", "50"],
        imageY: ["20", "50"],
        imageZoom: ["2", "1"],
      });

      const result = await updateAboutContent(initialState, formData);

      expect(result).toEqual({
        ok: true,
        message: "Los cambios se guardaron correctamente.",
      });
      expect(mocks.upsert).toHaveBeenCalledTimes(1);
      const args = mocks.upsert.mock.calls[0][0];
      expect(args.where).toEqual({ page: "quienes-somos" });
      expect(args.create).toMatchObject({ page: "quienes-somos" });
      expect(args.create.images).toEqual([
        {
          url: "https://drive.google.com/thumbnail?id=abc123defghij4567&sz=w1200",
          fit: "contain",
          x: 10,
          y: 20,
          zoom: 2,
        },
        { url: "https://example.com/foto.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
      ]);
      expect(args.create).toEqual({ page: "quienes-somos", ...args.update });
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/quienes-somos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        "/que-hacer-en-san-clemente",
      );
    });

    it("drops image rows with empty urls", async () => {
      const formData = buildFormData({
        intro: "",
        body: "",
        images: ["", "https://example.com/real.jpg"],
        imageFit: ["cover", "cover"],
        imageX: ["50", "50"],
        imageY: ["50", "50"],
        imageZoom: ["1", "1"],
      });

      const result = await updateAboutContent(initialState, formData);

      expect(result.ok).toBe(true);
      expect(mocks.upsert.mock.calls[0][0].update.images).toEqual([
        { url: "https://example.com/real.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
      ]);
    });

    it("returns field errors when the schema fails", async () => {
      const formData = buildFormData({
        intro: "",
        body: "",
        images: ["no-es-url"],
        imageFit: ["cover"],
        imageX: ["50"],
        imageY: ["50"],
        imageZoom: ["1"],
      });

      const result = await updateAboutContent(initialState, formData);

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.images).toBeDefined();
      expect(mocks.upsert).not.toHaveBeenCalled();
    });
  });

  describe("updateWhatToDoContent", () => {
    it("upserts the que-hacer row and revalidates both public pages", async () => {
      const formData = buildFormData({
        intro: "Planes",
        cardTitle: ["Playa", "Termas"],
        cardDescription: ["Arena", "Aguas termales"],
        images: [
          "https://example.com/playa.jpg",
          "https://example.com/termas.jpg",
        ],
        imageFit: ["cover", "cover"],
        imageX: ["50", "50"],
        imageY: ["50", "50"],
        imageZoom: ["1", "1"],
      });

      const result = await updateWhatToDoContent(initialState, formData);

      expect(result.ok).toBe(true);
      expect(mocks.upsert).toHaveBeenCalledTimes(1);
      const args = mocks.upsert.mock.calls[0][0];
      expect(args.where).toEqual({ page: "que-hacer" });
      expect(args.update.cards).toEqual([
        {
          title: "Playa",
          description: "Arena",
          image: { url: "https://example.com/playa.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
        },
        {
          title: "Termas",
          description: "Aguas termales",
          image: { url: "https://example.com/termas.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
        },
      ]);
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/quienes-somos");
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        "/que-hacer-en-san-clemente",
      );
    });

    it("drops cards whose title and image url are both empty", async () => {
      const formData = buildFormData({
        intro: "",
        cardTitle: ["Playa", "", ""],
        cardDescription: ["Arena", "", ""],
        images: ["https://example.com/playa.jpg", "", ""],
        imageFit: ["cover", "cover", "cover"],
        imageX: ["50", "50", "50"],
        imageY: ["50", "50", "50"],
        imageZoom: ["1", "1", "1"],
      });

      const result = await updateWhatToDoContent(initialState, formData);

      expect(result.ok).toBe(true);
      expect(mocks.upsert.mock.calls[0][0].update.cards).toEqual([
        {
          title: "Playa",
          description: "Arena",
          image: { url: "https://example.com/playa.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
        },
      ]);
    });

    it("returns card field errors when a kept card is missing its title", async () => {
      const formData = buildFormData({
        intro: "",
        cardTitle: [""],
        cardDescription: ["Desc"],
        images: ["https://example.com/playa.jpg"],
        imageFit: ["cover"],
        imageX: ["50"],
        imageY: ["50"],
        imageZoom: ["1"],
      });

      const result = await updateWhatToDoContent(initialState, formData);

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.cards).toContain(
        "El título del cuadro es obligatorio.",
      );
      expect(mocks.upsert).not.toHaveBeenCalled();
    });

    it("returns card field errors when a kept card has no image url", async () => {
      const formData = buildFormData({
        intro: "",
        cardTitle: ["Playa"],
        cardDescription: ["Arena"],
        images: [""],
        imageFit: ["cover"],
        imageX: ["50"],
        imageY: ["50"],
        imageZoom: ["1"],
      });

      const result = await updateWhatToDoContent(initialState, formData);

      expect(result.ok).toBe(false);
      expect(result.fieldErrors?.cards).toBeDefined();
      expect(mocks.upsert).not.toHaveBeenCalled();
    });
  });
});
