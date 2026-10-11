import { describe, it, expect, vi, beforeEach } from "vitest";
import { seed } from "../seed";

const mockFindUnique = vi.fn();
const mockCreate = vi.fn();

const mockPrismaClient = {
  user: {
    findUnique: mockFindUnique,
    create: mockCreate,
  },
};

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

describe("prisma seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates admin user when not present", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({
      email: "admin@alquileresanita.com.ar",
      role: "ADMIN",
    });

    await seed(mockPrismaClient as unknown as Parameters<typeof seed>[0]);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@alquileresanita.com.ar" },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: "admin@alquileresanita.com.ar",
        name: "Administrador",
        passwordHash: "hashed-password",
        role: "ADMIN",
      },
    });
  });

  it("skips creation when admin user already exists", async () => {
    mockFindUnique.mockResolvedValue({
      id: "existing-user",
      email: "admin@alquileresanita.com.ar",
      role: "ADMIN",
    });

    await seed(mockPrismaClient as unknown as Parameters<typeof seed>[0]);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@alquileresanita.com.ar" },
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
