import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  siteContentFindMany: vi.fn(),
  getAboutContent: vi.fn(),
  getWhatToDoContent: vi.fn(),
}));

vi.mock("@/lib/require-auth", () => ({
  requirePermission: (tab?: string) => mocks.requirePermission(tab),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteContent: {
      findMany: mocks.siteContentFindMany,
    },
  },
}));

vi.mock("@/lib/site-content", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/site-content")
  >("@/lib/site-content");
  return {
    ...actual,
    getAboutContent: () => mocks.getAboutContent(),
    getWhatToDoContent: () => mocks.getWhatToDoContent(),
  };
});

vi.mock("@/components/admin/AboutContentForm", () => ({
  AboutContentForm: ({ initialValues }: { initialValues: { intro: string } }) => (
    <div data-testid="about-form">{initialValues.intro}</div>
  ),
}));

vi.mock("@/components/admin/WhatToDoContentForm", () => ({
  WhatToDoContentForm: ({
    initialValues,
  }: {
    initialValues: { intro: string; cards: unknown[] };
  }) => (
    <div data-testid="what-todo-form">
      {initialValues.intro} ({initialValues.cards.length} cards)
    </div>
  ),
}));

import ContextoPage from "@/app/admin/contexto/page";
import {
  DEFAULT_ABOUT_CONTENT,
  DEFAULT_WHATTODO_CONTENT,
} from "@/lib/site-content";

describe("ContextoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockResolvedValue({
      user: { id: "user-1", isDefaultAdmin: true },
    });
    mocks.siteContentFindMany.mockResolvedValue([]);
    mocks.getAboutContent.mockResolvedValue(DEFAULT_ABOUT_CONTENT);
    mocks.getWhatToDoContent.mockResolvedValue(DEFAULT_WHATTODO_CONTENT);
  });

  it("requires the contexto tab permission", async () => {
    render(await ContextoPage());

    expect(mocks.requirePermission).toHaveBeenCalledWith("contexto");
  });

  it("renders the page header with its explanatory caption", async () => {
    render(await ContextoPage());

    expect(screen.getByRole("heading", { name: "Contexto" })).toBeInTheDocument();
    expect(
      screen.getByText(/páginas públicas «quiénes somos»|páginas públicas «quienes somos»/i),
    ).toBeInTheDocument();
  });

  it("renders both content sections preloaded with the defaults", async () => {
    render(await ContextoPage());

    expect(
      screen.getByRole("heading", { name: "Quienes somos" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "¿Qué hacer en San Clemente del Tuyú?",
      }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("about-form")).toHaveTextContent(
      DEFAULT_ABOUT_CONTENT.intro,
    );
    expect(screen.getByTestId("what-todo-form")).toHaveTextContent(
      `(6 cards)`,
    );
  });

  it("round-trips the persisted text when a row already exists", async () => {
    mocks.siteContentFindMany.mockResolvedValue([
      { page: "quienes-somos", intro: "Guardada", body: "Texto guardado" },
    ]);

    render(await ContextoPage());

    expect(screen.getByTestId("about-form")).toHaveTextContent("Guardada");
  });
});
