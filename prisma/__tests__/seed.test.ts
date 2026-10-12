import { describe, it, expect, vi, beforeEach } from "vitest";
import { seed, seedAdmin, seedProperties, seedRecipients } from "../seed";

const mockUserUpsert = vi.fn();
const mockPropertyUpsert = vi.fn();
const mockRecipientUpsert = vi.fn();

const mockPrismaClient = {
  user: { upsert: mockUserUpsert },
  property: { upsert: mockPropertyUpsert },
  transferRecipient: { upsert: mockRecipientUpsert },
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
    mockUserUpsert.mockImplementation(({ where, create }) => ({
      email: where.email,
      role: "ADMIN",
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
  });

  it("upserts the admin user by email", async () => {
    await seedAdmin(mockPrismaClient as unknown as Prisma);

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "admin@alquileresanita.com.ar" },
      update: {},
      create: {
        email: "admin@alquileresanita.com.ar",
        name: "Administrador",
        passwordHash: "hashed-password",
        role: "ADMIN",
      },
    });
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
      call[0].create.images.forEach((url: string) => {
        expect(url).toMatch(
          /^https:\/\/images\.unsplash\.com\/photo-[\w-]+/,
        );
      });
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

  it("is idempotent: running seed twice performs the same upserts and no creates", async () => {
    await seed(mockPrismaClient as unknown as Prisma);
    const firstRunUserCalls = mockUserUpsert.mock.calls.length;
    const firstRunPropertyCalls = mockPropertyUpsert.mock.calls.length;
    const firstRunRecipientCalls = mockRecipientUpsert.mock.calls.length;

    await seed(mockPrismaClient as unknown as Prisma);

    expect(mockUserUpsert).toHaveBeenCalledTimes(firstRunUserCalls * 2);
    expect(mockPropertyUpsert).toHaveBeenCalledTimes(firstRunPropertyCalls * 2);
    expect(mockRecipientUpsert).toHaveBeenCalledTimes(
      firstRunRecipientCalls * 2,
    );

    // Idempotency relies exclusively on upserts: no findUnique+create path.
    mockPropertyUpsert.mock.calls.forEach((call) => {
      expect(call[0].update).toEqual({});
    });
  });

  it("has no early global return: an existing admin does not skip properties or recipients", async () => {
    // Simulate the admin already existing (upsert takes the update path).
    mockUserUpsert.mockResolvedValue({
      email: "admin@alquileresanita.com.ar",
      role: "ADMIN",
      name: "Administrador",
    });

    await seed(mockPrismaClient as unknown as Prisma);

    expect(mockUserUpsert).toHaveBeenCalledTimes(1);
    expect(mockPropertyUpsert).toHaveBeenCalledTimes(4);
    expect(mockRecipientUpsert).toHaveBeenCalledTimes(1);
  });
});
