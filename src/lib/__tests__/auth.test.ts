import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorize } from "@/lib/auth";

const mockFindUnique = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";

const adminRole = {
  id: "role-1",
  name: "Administrador",
  allowedTabs: ["panel", "calendario", "propiedades"],
  isDefaultAdmin: true,
};

function makeUser() {
  return {
    id: "user-1",
    email: "admin@alquileresanita.com.ar",
    name: "Administrador",
    passwordHash: "hashed-password",
    mustChangePassword: false,
    roleId: adminRole.id,
    role: adminRole,
  };
}

describe("auth authorize callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("returns user object for valid credentials", async () => {
    const user = makeUser();

    mockFindUnique.mockResolvedValue(user);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const result = await authorize({
      email: "admin@alquileresanita.com.ar",
      password: "admin123",
    });

    expect(result).toEqual({
      id: "user-1",
      email: "admin@alquileresanita.com.ar",
      name: "Administrador",
      roleId: "role-1",
      roleName: "Administrador",
      allowedTabs: ["panel", "calendario", "propiedades"],
      mustChangePassword: false,
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@alquileresanita.com.ar" },
      include: { role: true },
    });
  });

  it("returns null when password is invalid", async () => {
    const user = makeUser();

    mockFindUnique.mockResolvedValue(user);
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const result = await authorize({
      email: "admin@alquileresanita.com.ar",
      password: "wrong-password",
    });

    expect(result).toBeNull();
  });

  it("returns null when credentials are missing", async () => {
    const result = await authorize({});
    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await authorize({
      email: "missing@alquileresanita.com.ar",
      password: "admin123",
    });

    expect(result).toBeNull();
  });
});
