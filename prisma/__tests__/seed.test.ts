import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  seed,
  seedRoles,
  seedAdmin,
  seedProperties,
  seedRecipients,
  seedExpenseTypes,
} from "../seed";

const mockRoleUpsert = vi.fn();
const mockRoleFindUnique = vi.fn();
const mockUserUpsert = vi.fn();
const mockPropertyUpsert = vi.fn();
const mockRecipientUpsert = vi.fn();
const mockExpenseTypeUpsert = vi.fn();

const mockPrismaClient = {
  role: { upsert: mockRoleUpsert, findUnique: mockRoleFindUnique },
  user: { upsert: mockUserUpsert },
  property: { upsert: mockPropertyUpsert },
  transferRecipient: { upsert: mockRecipientUpsert },
  expenseType: { upsert: mockExpenseTypeUpsert },
};

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

type Prisma = Parameters<typeof seed>[0];

describe("prisma seed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("DEFAULT_ADMIN_EMAIL", "admin@alquileresanita.com.ar");
    vi.stubEnv("DEFAULT_ADMIN_PASSWORD", "admin123");

    mockRoleUpsert.mockImplementation(({ where, create }) => ({
      id: create.name === "Administrador" ? "role-admin" : "role-operative",
      name: where.name,
      allowedTabs: create.allowedTabs,
      isDefaultAdmin: create.name === "Administrador",
      ...create,
    }));
    mockRoleFindUnique.mockImplementation(({ where }) => {
      if (where.name === "Administrador") {
        return { id: "role-admin", name: "Administrador" };
      }
      return null;
    });
    mockUserUpsert.mockImplementation(({ where, create }) => ({
      email: where.email,
      roleId: create?.roleId ?? "role-admin",
      ...create,
    }));
    mockPropertyUpsert.mockImplementation(({ where, create }) => ({
      slug: where.slug,
      ...create,
    }));
    mockRecipientUpsert.mockImplementation(({ where, create }) => ({
      name: where.name,
      ...create,
    }));
    mockExpenseTypeUpsert.mockImplementation(({ where, create }) => ({
      name: where.name,
      ...create,
    }));
  });

  it("upserts the default roles", async () => {
    await seedRoles(mockPrismaClient as unknown as Prisma);

    expect(mockRoleUpsert).toHaveBeenCalledWith({
      where: { name: "Administrador" },
      update: {},
      create: {
        name: "Administrador",
        allowedTabs: [
          "panel",
          "calendario",
          "propiedades",
          "reservas",
          "huespedes",
          "destinatarios",
          "gastos",
        ],
        isDefaultAdmin: true,
      },
    });
    expect(mockRoleUpsert).toHaveBeenCalledWith({
      where: { name: "Gestion diaria" },
      update: {},
      create: {
        name: "Gestion diaria",
        allowedTabs: ["calendario", "gastos"],
        isDefaultAdmin: false,
      },
    });
  });

  it("upserts the admin user by email using the Administrador role", async () => {
    await seedAdmin(mockPrismaClient as unknown as Prisma);

    expect(mockRoleFindUnique).toHaveBeenCalledWith({
      where: { name: "Administrador" },
    });
    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "admin@alquileresanita.com.ar" },
      update: {},
      create: {
        email: "admin@alquileresanita.com.ar",
        name: "Administrador",
        passwordHash: "hashed-password",
        roleId: "role-admin",
      },
    });
  });

  it("warns and skips admin creation when default admin env vars are missing", async () => {
    vi.stubEnv("DEFAULT_ADMIN_EMAIL", "");
    vi.stubEnv("DEFAULT_ADMIN_PASSWORD", "");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await seedAdmin(mockPrismaClient as unknown as Prisma);

    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    expect(mockRoleFindUnique).not.toHaveBeenCalled();
    expect(mockUserUpsert).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("upserts the four properties by slug", async () => {
    await seedProperties(mockPrismaClient as unknown as Prisma);

    const slugs = mockPropertyUpsert.mock.calls.map(
      (call) => call[0].where.slug,
    );

    expect(slugs).toEqual(["depto-1", "depto-2", "casita", "chalet"]);
    expect(slugs).toHaveLength(4);

    const capacities = mockPropertyUpsert.mock.calls.map(
      (call) => call[0].create.capacity,
    );
    expect(capacities).toEqual([2, 4, 4, 6]);

    const sortOrders = mockPropertyUpsert.mock.calls.map(
      (call) => call[0].create.sortOrder,
    );
    expect(sortOrders).toEqual([1, 2, 3, 4]);

    mockPropertyUpsert.mock.calls.forEach((call) => {
      expect(call[0].create.published).toBe(true);
      expect(call[0].update).toEqual({});
      expect(call[0].create.amenities).toEqual(["Wi-Fi", "Cocina equipada"]);
      expect(call[0].create.images.length).toBeGreaterThanOrEqual(2);
      expect(call[0].create.images.length).toBeLessThanOrEqual(3);
      call[0].create.images.forEach(
        (entry: { url: string; fit: string; x: number; y: number; zoom: number }) => {
          expect(entry.url).toMatch(
            /^https:\/\/images\.unsplash\.com\/photo-[\w-]+/,
          );
          expect(entry.fit).toBe("cover");
          expect(entry.x).toBe(50);
          expect(entry.y).toBe(50);
          expect(entry.zoom).toBe(1);
        },
      );
    });
  });

  it("upserts the Sonia recipient by name", async () => {
    await seedRecipients(mockPrismaClient as unknown as Prisma);

    expect(mockRecipientUpsert).toHaveBeenCalledWith({
      where: { name: "Sonia" },
      update: {},
      create: { name: "Sonia" },
    });
  });

  it("seedExpenseTypes upserts idempotent: Mantenimiento (requiresProperty) and Consorcio (general)", async () => {
    await seedExpenseTypes(mockPrismaClient as unknown as Prisma);

    expect(mockExpenseTypeUpsert.mock.calls.map((call) => call[0])).toEqual([
      {
        where: { name: "Mantenimiento" },
        update: {},
        create: { name: "Mantenimiento", requiresProperty: true },
      },
      {
        where: { name: "Consorcio" },
        update: {},
        create: { name: "Consorcio", requiresProperty: false },
      },
    ]);
  });

  it("calls the sections in order: roles -> admin -> properties -> recipients -> expenseTypes", async () => {
    await seed(mockPrismaClient as unknown as Prisma);

    expect(mockRoleUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockUserUpsert.mock.invocationCallOrder[0],
    );
    expect(mockUserUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockPropertyUpsert.mock.invocationCallOrder[0],
    );
    expect(mockPropertyUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockRecipientUpsert.mock.invocationCallOrder[0],
    );
    expect(mockRecipientUpsert.mock.invocationCallOrder[0]).toBeLessThan(
      mockExpenseTypeUpsert.mock.invocationCallOrder[0],
    );
  });

  it("is idempotent: running seed twice performs the same upserts and no creates", async () => {
    await seed(mockPrismaClient as unknown as Prisma);
    const firstRunRoleCalls = mockRoleUpsert.mock.calls.length;
    const firstRunUserCalls = mockUserUpsert.mock.calls.length;
    const firstRunPropertyCalls = mockPropertyUpsert.mock.calls.length;
    const firstRunRecipientCalls = mockRecipientUpsert.mock.calls.length;
    const firstRunTypeCalls = mockExpenseTypeUpsert.mock.calls.length;

    await seed(mockPrismaClient as unknown as Prisma);

    expect(mockRoleUpsert).toHaveBeenCalledTimes(firstRunRoleCalls * 2);
    expect(mockUserUpsert).toHaveBeenCalledTimes(firstRunUserCalls * 2);
    expect(mockPropertyUpsert).toHaveBeenCalledTimes(firstRunPropertyCalls * 2);
    expect(mockRecipientUpsert).toHaveBeenCalledTimes(
      firstRunRecipientCalls * 2,
    );
    expect(mockExpenseTypeUpsert).toHaveBeenCalledTimes(firstRunTypeCalls * 2);

    // Idempotency relies exclusively on upserts: no findUnique+create path.
    mockPropertyUpsert.mock.calls.forEach((call) => {
      expect(call[0].update).toEqual({});
    });
    mockExpenseTypeUpsert.mock.calls.forEach((call) => {
      expect(call[0].update).toEqual({});
    });
  });

  it("has no early global return: an existing admin does not skip properties or recipients", async () => {
    // Simulate the admin already existing (upsert takes the update path).
    mockUserUpsert.mockResolvedValue({
      email: "admin@alquileresanita.com.ar",
      roleId: "role-admin",
      name: "Administrador",
    });

    await seed(mockPrismaClient as unknown as Prisma);

    expect(mockRoleUpsert).toHaveBeenCalledTimes(2);
    expect(mockUserUpsert).toHaveBeenCalledTimes(1);
    expect(mockPropertyUpsert).toHaveBeenCalledTimes(4);
    expect(mockRecipientUpsert).toHaveBeenCalledTimes(1);
    expect(mockExpenseTypeUpsert).toHaveBeenCalledTimes(2);
  });
});
