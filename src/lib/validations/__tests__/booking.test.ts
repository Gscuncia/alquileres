import { describe, it, expect } from "vitest";
import { bookingSchema } from "@/lib/validations/booking";

const validBooking = {
  propertyId: "prop-1",
  guestId: "guest-1",
  checkInDate: "2026-10-10",
  checkInTime: "12:00",
  checkOutDate: "2026-10-13",
  checkOutTime: "10:00",
  pricePerNight: 150,
  depositAmount: 50,
  depositPaymentType: "EFECTIVO",
  depositPaymentMethod: "",
  depositRecipientId: "",
  restPaymentType: "EFECTIVO",
  restRecipientId: "",
  notes: "",
};

function parse(overrides: Record<string, unknown> = {}) {
  return bookingSchema.safeParse({ ...validBooking, ...overrides });
}

describe("bookingSchema", () => {
  it("accepts a valid efectivo booking with a guest", () => {
    const result = parse();
    expect(result.success).toBe(true);
  });

  it("accepts a valid transferencia booking with recipient and keeps the data", () => {
    const result = parse({
      depositPaymentType: "TRANSFERENCIA",
      depositRecipientId: "recipient-sonia",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositRecipientId).toBe("recipient-sonia");
    }
  });

  it("rejects an empty guestId (El huésped es obligatorio.)", () => {
    const result = parse({ guestId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) => String(candidate.path[0]) === "guestId",
      );
      expect(issue?.message).toBe("El huésped es obligatorio.");
    }
  });

  it("no longer collects guest identity fields inline", () => {
    // The booking schema derives from the guest agenda; names/DNI/phone live
    // on the Guest record only. guestSchema owns that validation.
    const result = bookingSchema.safeParse({
      ...validBooking,
      guestId: "guest-1",
      firstName: "Juan",
      lastName: "Pérez",
      dni: "32456778",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("firstName");
      expect(result.data).not.toHaveProperty("lastName");
      expect(result.data).not.toHaveProperty("dni");
    }
  });

  it("defaults depositAmount to 0 when omitted", () => {
    const result = bookingSchema.safeParse({
      ...validBooking,
      depositAmount: undefined,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.depositAmount).toBe(0);
    }
  });

  describe("required fields name the field in Spanish", () => {
    const requiredFieldCases = [
      ["guestId", /hu[eé]sped/i],
      ["propertyId", /propiedad/i],
    ] as const;

    it.each(requiredFieldCases)(`rejects an empty %s`, (field, pattern) => {
      const result = parse({ [field]: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === field,
        );
        expect(issue?.message).toMatch(pattern);
      }
    });
  });

  describe("money", () => {
    it("rejects pricePerNight = 0 asking for a positive price", () => {
      const result = parse({ pricePerNight: 0 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "pricePerNight",
        );
        expect(issue?.message).toMatch(/mayor que 0/);
      }
    });

    it("rejects a negative deposit amount", () => {
      const result = parse({ depositAmount: -1 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "depositAmount",
        );
        expect(issue?.message).toMatch(/mayor o igual a 0/);
      }
    });
  });

  describe("30-minute time granularity", () => {
    it("accepts 10:00, 14:30 and 23:30", () => {
      expect(parse({ checkInTime: "10:00", checkOutTime: "14:30" }).success).toBe(
        true,
      );
      expect(parse({ checkInTime: "23:30", checkOutTime: "00:00" }).success).toBe(
        true,
      );
    });

    it("rejects 10:15 (off the 30-minute grid)", () => {
      const result = parse({ checkInTime: "10:15" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "checkInTime",
        );
        expect(issue?.message).toMatch(/30 minutos/);
      }
    });

    it("rejects '24:00' and non-time garbage", () => {
      expect(parse({ checkOutTime: "24:00" }).success).toBe(false);
      expect(parse({ checkOutTime: "tarde" }).success).toBe(false);
    });
  });

  describe("stay span (checkIn < checkOut)", () => {
    it("rejects checkOut equal to checkIn", () => {
      const result = parse({
        checkInDate: "2026-10-13",
        checkInTime: "12:00",
        checkOutDate: "2026-10-13",
        checkOutTime: "12:00",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "checkOut",
        );
        expect(issue?.message).toMatch(/posteriores al ingreso/);
      }
    });

    it("rejects checkOut before checkIn", () => {
      const result = parse({
        checkInDate: "2026-10-13",
        checkOutDate: "2026-10-12",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "checkOut",
        );
        expect(issue?.message).toMatch(/posteriores al ingreso/);
      }
    });
  });

  describe("payment rules", () => {
    it("rejects a deposit TRANSFERENCIA without recipient", () => {
      const result = parse({
        depositPaymentType: "TRANSFERENCIA",
        depositRecipientId: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "depositRecipientId",
        );
        expect(issue?.message).toBe(
          "El destinatario es obligatorio para la seña por transferencia.",
        );
      }
    });

    it("rejects a rest TRANSFERENCIA without recipient", () => {
      const result = parse({
        restPaymentType: "TRANSFERENCIA",
        restRecipientId: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "restRecipientId",
        );
        expect(issue?.message).toBe(
          "El destinatario es obligatorio para el monto a pagar por transferencia.",
        );
      }
    });

    it("accepts TRANSFERENCIA in both parts with their own recipients", () => {
      const result = parse({
        depositPaymentType: "TRANSFERENCIA",
        depositRecipientId: "recipient-sonia",
        restPaymentType: "TRANSFERENCIA",
        restRecipientId: "recipient-pablo",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depositRecipientId).toBe("recipient-sonia");
        expect(result.data.restRecipientId).toBe("recipient-pablo");
      }
    });

    it("clears recipients when the part is EFECTIVO", () => {
      const result = parse({
        depositPaymentType: "EFECTIVO",
        depositRecipientId: "recipient-sonia",
        restPaymentType: "EFECTIVO",
        restRecipientId: "recipient-pablo",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Never persists an efectivo-with-recipient part.
        expect(result.data.depositRecipientId).toBeUndefined();
        expect(result.data.restRecipientId).toBeUndefined();
      }
    });

    it("rejects a deposit above the stay total (150 × 3 = 450)", () => {
      const result = parse({ depositAmount: 450.01 });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "depositAmount",
        );
        expect(issue?.message).toBe(
          "La seña no puede superar el monto total de la reserva.",
        );
      }
    });

    it("accepts a deposit equal to the stay total", () => {
      const result = parse({ depositAmount: 450 });
      expect(result.success).toBe(true);
    });
  });
});
