import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContent: {
      findUnique: mocks.findUnique,
    },
  },
}));

import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_WHATTODO_CONTENT,
  getAboutContent,
  getWhatToDoContent,
} from "@/lib/site-content";

describe("site content library", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exports the built-in defaults with the original hardcoded content", () => {
    expect(DEFAULT_ABOUT_CONTENT.paragraphs).toHaveLength(3);
    expect(DEFAULT_ABOUT_CONTENT.intro).toContain("Una familia");
    expect(DEFAULT_ABOUT_CONTENT.images).toHaveLength(1);
    expect(DEFAULT_ABOUT_CONTENT.images[0].url).toContain("unsplash.com");

    expect(DEFAULT_WHATTODO_CONTENT.cards).toHaveLength(6);
    for (const card of DEFAULT_WHATTODO_CONTENT.cards) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.image.url).toContain("unsplash.com");
      expect(card.image).toMatchObject({ fit: "cover", x: 50, y: 50, zoom: 1 });
    }
  });

  it("queries the page rows by their page key", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await getAboutContent();
    await getWhatToDoContent();

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { page: "quienes-somos" },
    });
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { page: "que-hacer" },
    });
  });

  it("falls back to the defaults when prisma returns null", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(getAboutContent()).resolves.toEqual(DEFAULT_ABOUT_CONTENT);
    await expect(getWhatToDoContent()).resolves.toEqual(DEFAULT_WHATTODO_CONTENT);
  });

  it("falls back to the defaults when prisma throws", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));

    await expect(getAboutContent()).resolves.toEqual(DEFAULT_ABOUT_CONTENT);
    await expect(getWhatToDoContent()).resolves.toEqual(DEFAULT_WHATTODO_CONTENT);
  });

  it("parses paragraphs from the stored body text", async () => {
    mocks.findUnique.mockResolvedValue({
      intro: "Bajada",
      body: "Uno.\n\nDos.\n\n \n\nTres.",
      images: [],
    });

    const content = await getAboutContent();

    expect(content.paragraphs).toEqual(["Uno.", "Dos.", "Tres."]);
    expect(content.intro).toBe("Bajada");
  });

  it("normalizes stored images and drops unusable entries", async () => {
    mocks.findUnique.mockResolvedValue({
      intro: "x",
      body: "",
      images: [
        { url: " https://a.com/framed.jpg ", fit: "contain", x: 10, y: 20, zoom: 2 },
        "https://a.com/plain.jpg",
        { url: "" },
        42,
      ],
    });

    const content = await getAboutContent();

    expect(content.images).toEqual([
      { url: "https://a.com/framed.jpg", fit: "contain", x: 10, y: 20, zoom: 2 },
      { url: "https://a.com/plain.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
    ]);
  });

  it("drops cards with empty title or empty image url", async () => {
    mocks.findUnique.mockResolvedValue({
      intro: "x",
      cards: [
        {
          title: "Válida",
          description: "Desc",
          image: { url: "https://a.com/1.jpg", fit: "cover", x: 50, y: 50, zoom: 1 },
        },
        { title: "", description: "sin título", image: { url: "https://a.com/2.jpg" } },
        { title: "Sin imagen", description: "x", image: { url: "" } },
        { title: "Legacy", description: "", image: "https://a.com/plain.jpg" },
        "basura",
      ],
    });

    const content = await getWhatToDoContent();

    expect(content.cards.map((card) => card.title)).toEqual([
      "Válida",
      "Legacy",
    ]);
    expect(content.cards[1].image).toEqual({
      url: "https://a.com/plain.jpg",
      fit: "cover",
      x: 50,
      y: 50,
      zoom: 1,
    });
  });

  it("keeps a stored empty intro when the row exists", async () => {
    mocks.findUnique.mockResolvedValue({ intro: "", body: "Solo.", cards: [] });

    const [about, whatToDo] = await Promise.all([
      getAboutContent(),
      getWhatToDoContent(),
    ]);

    expect(about.intro).toBe("");
    expect(whatToDo.intro).toBe("");
  });
});
