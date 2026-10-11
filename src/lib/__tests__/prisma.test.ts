import { describe, it, expect, vi } from "vitest";

const mockFindMany = vi.fn();

const mockPrismaInstance = {
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  user: {
    findMany: mockFindMany,
  },
};

const mockPrismaClient = vi.fn().mockReturnValue(mockPrismaInstance);

vi.mock("@prisma/client", () => ({
  PrismaClient: mockPrismaClient,
}));

describe("prisma singleton", () => {
  it("exports a PrismaClient instance", async () => {
    const { prisma } = await import("@/lib/prisma");
    expect(prisma).toBe(mockPrismaInstance);
  });

  it("reuses the same PrismaClient instance across imports", async () => {
    const { prisma: first } = await import("@/lib/prisma");
    const { prisma: second } = await import("@/lib/prisma");

    expect(first).toBe(second);
    expect(mockPrismaClient).toHaveBeenCalledTimes(1);
  });

  it("queries User models through the mocked client", async () => {
    const users = [
      { id: "1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    ];
    mockFindMany.mockResolvedValue(users);

    const { prisma } = await import("@/lib/prisma");
    const result = await prisma.user.findMany();

    expect(result).toEqual(users);
    expect(mockFindMany).toHaveBeenCalled();
  });
});
