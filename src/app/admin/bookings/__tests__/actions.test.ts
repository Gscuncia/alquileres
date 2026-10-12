import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  txFindFirst: vi.fn(),
  txCreate: vi.fn(),
  txUpdate: vi.fn(),
  bookingFindUnique: vi.fn(),
  bookingDelete: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: () => mocks.auth(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
    booking: {
      findUnique: mocks.bookingFindUnique,
      delete: mocks.bookingDelete,
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
  createBooking,
  updateBooking,
  deleteBooking,
} from "@/app/admin/bookings/actions";
import type { ActionState } from "@/lib/admin-action-types";

function makeTx() {
  return {
    $queryRaw: mocks.queryRaw,
    booking: {
      findFirst: mocks.txFindFirst,
      create: mocks.txCreate,
      update: mocks.txUpdate,
    },
  };
}

function buildBookingFormData(
  overrides: Record<string, string> = {},
): FormData {
  const formData = new FormData();
  const base: Record<string, string> = {
    propertyId: "prop-1",
    firstName: "Juan",
    lastName: "Pérez",
    dni: "32456778",
    phone: "11 5555 5555",
    email: "",
    checkInDate: "2026-10-10",
    checkInTime: "12:00",
    checkOutDate: "2026-10-13",
    checkOutTime: "10:00",
    pricePerNight: "150",
    depositAmount: "50",
    paymentType: "EFECTIVO",
    paymentMethod: "",
    notes: "",
    recipientId: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(base)) {
    formData.append(key, value);
  }
  return formData;
}

const initialState: ActionState = { ok: false };

describe("booking actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      user: { id: "user-1", email: "admin@alquileresanita.com.ar", role: "ADMIN" },
    });
    mocks.queryRaw.mockResolvedValue([]);
    mocks.transaction.mockImplementation(
      async (callback: (tx: unknown) => unknown) => callback(makeTx()),
    );
    mocks.txFindFirst.mockResolvedValue(null);
    mocks.txCreate.mockResolvedValue({});
    mocks.txUpdate.mockResolvedValue({});
    mocks.bookingFindUnique.mockResolvedValue({ id: "b-1", propertyId: "prop-1" });
    mocks.bookingDelete.mockResolvedValue({});
  });

  it("throws 'No autorizado' when the caller is not an admin", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "user-2", email: "operative@alquileresanita.com.ar", role: "OPERATIVE" },
    });

    await expect(
      createBooking(initialState, buildBookingFormData()),
    ).rejects.toThrow("No autorizado");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("throws 'No autorizado' when there is no session", async () => {
    mocks.auth.mockResolvedValue(null);

    await expect(
      deleteBooking(buildBookingFormData({ id: "b-1" })),
    ).rejects.toThrow("No autorizado");
    expect(mocks.bookingDelete).not.toHaveBeenCalled();
  });

  it("rejects invalid input with Spanish field errors before opening a transaction", async () => {
    const result = await createBooking(
      initialState,
      buildBookingFormData({
        dni: "123456789",
        email: "no-es-mail",
        pricePerNight: "0",
        checkInTime: "10:15",
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.dni).toMatch(/7 y 8 dígitos/);
    expect(result.fieldErrors?.email).toMatch(/formato válido/);
    expect(result.fieldErrors?.pricePerNight).toMatch(/mayor que 0/);
    expect(result.fieldErrors?.checkInTime).toMatch(/30 minutos/);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a missing propertyId without touching the database", async () => {
    const result = await createBooking(
      initialState,
      buildBookingFormData({ propertyId: "" }),
    );

    expect(result.fieldErrors?.propertyId).toMatch(/propiedad/i);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a booking inside an advisory-locked transaction and revalidates admin views", async () => {
    const result = await createBooking(initialState, buildBookingFormData());

    expect(result.ok).toBe(true);
    expect(result.message).toMatch(/guardaron correctamente/i);
    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        propertyId: "prop-1",
        firstName: "Juan",
        lastName: "Pérez",
        dni: "32456778",
        checkIn: new Date("2026-10-10T12:00:00-03:00"),
        checkOut: new Date("2026-10-13T10:00:00-03:00"),
        pricePerNight: 150,
        depositAmount: 50,
        paymentType: "EFECTIVO",
        transferRecipientId: null,
      }),
    });
    // The advisory lock is the FIRST statement of the transaction.
    expect(mocks.queryRaw).toHaveBeenCalledTimes(1);
    const queryTag = String(mocks.queryRaw.mock.calls[0][0].join(""));
    expect(queryTag).toContain("pg_advisory_xact_lock");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/propiedades/prop-1/agenda",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/reservas");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/destinatarios");
  });

  it("scopes the conflict query to the property and uses inclusive-exclusive bounds", async () => {
    await createBooking(initialState, buildBookingFormData());

    expect(mocks.txFindFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        propertyId: "prop-1",
        checkIn: { lt: new Date("2026-10-13T10:00:00-03:00") },
        checkOut: { gt: new Date("2026-10-10T12:00:00-03:00") },
      }),
      select: { firstName: true, lastName: true, checkIn: true, checkOut: true },
    });
  });

  it("rejects an overlapping stay with a Spanish conflict naming client and dates", async () => {
    mocks.txFindFirst.mockResolvedValue({
      firstName: "Ana",
      lastName: "Gómez",
      checkIn: new Date("2026-10-12T12:00:00-03:00"),
      checkOut: new Date("2026-10-14T10:00:00-03:00"),
    });

    const result = await createBooking(initialState, buildBookingFormData());

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Conflicto con la reserva de Ana Gómez");
    expect(result.message).toContain("→");
    expect(result.message).toContain("2026");
    expect(mocks.txCreate).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("never persists an efectivo booking with a recipient", async () => {
    await createBooking(
      initialState,
      buildBookingFormData({ recipientId: "recipient-sonia" }),
    );

    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ transferRecipientId: null }),
    });
  });

  it("persists the recipient for a transferencia payment", async () => {
    await createBooking(
      initialState,
      buildBookingFormData({
        paymentType: "TRANSFERENCIA",
        recipientId: "recipient-sonia",
      }),
    );

    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentType: "TRANSFERENCIA",
        transferRecipientId: "recipient-sonia",
      }),
    });
  });

  describe("edit self-exclusion", () => {
    it("succeeds on its own stay: excludeId excludes the booking itself", async () => {
      const formData = buildBookingFormData({ id: "b-1" });

      const result = await updateBooking(initialState, formData);

      expect(result.ok).toBe(true);
      expect(mocks.bookingFindUnique).toHaveBeenCalledWith({
        where: { id: "b-1" },
        select: { id: true },
      });
      expect(mocks.txFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: { not: "b-1" } }),
        select: { firstName: true, lastName: true, checkIn: true, checkOut: true },
      });
      expect(mocks.txUpdate).toHaveBeenCalledWith({
        where: { id: "b-1" },
        data: expect.objectContaining({ propertyId: "prop-1" }),
      });
    });

    it("rejects moving onto another existing stay and leaves that booking unchanged", async () => {
      mocks.txFindFirst.mockResolvedValue({
        firstName: "Ana",
        lastName: "Gómez",
        checkIn: new Date("2026-10-12T12:00:00-03:00"),
        checkOut: new Date("2026-10-14T10:00:00-03:00"),
      });

      const result = await updateBooking(
        initialState,
        buildBookingFormData({ id: "b-1" }),
      );

      expect(result.ok).toBe(false);
      expect(result.message).toContain("Conflicto con la reserva de Ana Gómez");
      expect(mocks.txFindFirst).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: { not: "b-1" } }),
        select: { firstName: true, lastName: true, checkIn: true, checkOut: true },
      });
      expect(mocks.txUpdate).not.toHaveBeenCalled();
    });

    it("returns a not-found message for an unknown booking id", async () => {
      mocks.bookingFindUnique.mockResolvedValue(null);

      const result = await updateBooking(
        initialState,
        buildBookingFormData({ id: "desconocida" }),
      );

      expect(result.ok).toBe(false);
      expect(result.message).toMatch(/no encontrada/i);
      expect(mocks.transaction).not.toHaveBeenCalled();
    });
  });

  describe("concurrent saves on the same property", () => {
    it("exactly one of two parallel saves succeeds", async () => {
      const stored: Array<{
        propertyId: string;
        checkIn: Date;
        checkOut: Date;
        firstName: string;
        lastName: string;
      }> = [];

      // Mimics pg_advisory_xact_lock: transactions on the same property run
      // strictly one after the other, each seeing the committed winner of the
      // previous one. The real database race is verified manually on Neon per
      // the design's verification notes.
      let tail: Promise<unknown> = Promise.resolve();
      mocks.transaction.mockImplementation(
        async (callback: (tx: unknown) => unknown) => {
          const tx = {
            $queryRaw: vi.fn().mockResolvedValue([]),
            booking: {
              findFirst: vi.fn(async (args: { where: {
                propertyId: string;
                checkIn: { lt: Date };
                checkOut: { gt: Date };
              } }) => {
                const newOut = args.where.checkIn.lt;
                const newIn = args.where.checkOut.gt;
                return (
                  stored.find(
                    (b) =>
                      b.propertyId === args.where.propertyId &&
                      b.checkIn < newOut &&
                      b.checkOut > newIn,
                  ) ?? null
                );
              }),
              create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
                stored.push({
                  propertyId: data.propertyId as string,
                  checkIn: data.checkIn as Date,
                  checkOut: data.checkOut as Date,
                  firstName: data.firstName as string,
                  lastName: data.lastName as string,
                });
                return { id: "created" };
              }),
              update: vi.fn(),
            },
          };
          const run = tail.then(() => callback(tx));
          tail = run.catch(() => undefined);
          return run;
        },
      );

      const formData = buildBookingFormData({ firstName: "Juana" });
      const [first, second] = await Promise.all([
        createBooking(initialState, formData),
        createBooking(initialState, formData),
      ]);

      const successes = [first, second].filter((r) => r.ok);
      const failures = [first, second].filter((r) => !r.ok);
      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      expect(failures[0].message).toMatch(/Conflicto con la reserva de Juana Pérez/i);
      // Exactly one row persisted for the contended window.
      expect(stored).toHaveLength(1);
    });
  });

  describe("deleteBooking", () => {
    it("deletes, revalidates the agenda and both lists, then redirects to redirectTo", async () => {
      const formData = new FormData();
      formData.append("id", "b-1");
      formData.append("redirectTo", "/admin/propiedades/prop-1/agenda?mes=2026-10");

      await deleteBooking(formData);

      expect(mocks.bookingDelete).toHaveBeenCalledWith({ where: { id: "b-1" } });
      expect(mocks.revalidatePath).toHaveBeenCalledWith(
        "/admin/propiedades/prop-1/agenda",
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/reservas");
      expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
      expect(mocks.redirect).toHaveBeenCalledWith(
        "/admin/propiedades/prop-1/agenda?mes=2026-10",
      );
    });

    it("falls back to /admin/reservas when redirectTo is not an admin path", async () => {
      const formData = new FormData();
      formData.append("id", "b-1");
      formData.append("redirectTo", "https://evil.example.com");

      await deleteBooking(formData);

      expect(mocks.redirect).toHaveBeenCalledWith("/admin/reservas");
    });

    it("redirects without deleting when the id is missing", async () => {
      await deleteBooking(new FormData());

      expect(mocks.bookingDelete).not.toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/admin/reservas");
    });
  });
});
