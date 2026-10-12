import { describe, it, expect } from "vitest";
import { bookingSchema } from "@/lib/validations/booking";

const validBooking = {
  propertyId: "prop-1",
  firstName: "Juan",
  lastName: "Pérez",
  dni: "32456778",
  phone: "+54 11 5555-5555",
  email: "",
  checkInDate: "2026-10-10",
  checkInTime: "12:00",
  checkOutDate: "2026-10-13",
  checkOutTime: "10:00",
  pricePerNight: 150,
  depositAmount: 50,
  paymentType: "EFECTIVO",
  paymentMethod: "",
  notes: "",
  recipientId: "",
};

function parse(overrides: Record<string, unknown> = {}) {
  return bookingSchema.safeParse({ ...validBooking, ...overrides });
}

describe("bookingSchema", () => {
  it("accepts a valid efectivo booking", () => {
    const result = parse();
    expect(result.success).toBe(true);
  });

  it("accepts a valid transferencia booking with recipient and keeps the data", () => {
    const result = parse({
      paymentType: "TRANSFERENCIA",
      recipientId: "recipient-sonia",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.recipientId).toBe("recipient-sonia");
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
      ["firstName", /nombre/i],
      ["lastName", /apellido/i],
      ["dni", /dni/i],
      ["phone", /tel[eé]fono/i],
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

  describe("dni", () => {
    it("accepts 7 and 8 digit DNIs", () => {
      expect(parse({ dni: "1234567" }).success).toBe(true);
      expect(parse({ dni: "12345678" }).success).toBe(true);
    });

    it("rejects 'abc' with the 7–8 digit message", () => {
      const result = parse({ dni: "abc" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "dni",
        );
        expect(issue?.message).toMatch(/7 y 8 dígitos/);
      }
    });

    it("rejects 9 digits", () => {
      expect(parse({ dni: "123456789" }).success).toBe(false);
    });
  });

  describe("email", () => {
    it("rejects 'no-es-mail' with a format message", () => {
      const result = parse({ email: "no-es-mail" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "email",
        );
        expect(issue?.message).toMatch(/formato válido/);
      }
    });

    it("accepts a valid email", () => {
      const result = parse({ email: "juan@example.com" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("juan@example.com");
      }
    });

    it("treats an empty email as omitted", () => {
      const result = parse({ email: "" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeUndefined();
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
    it("rejects TRANSFERENCIA without recipient", () => {
      const result = parse({
        paymentType: "TRANSFERENCIA",
        recipientId: "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "recipientId",
        );
        expect(issue?.message).toMatch(/destinatario es obligatorio/);
      }
    });

    it("clears the recipient for EFECTIVO even when one was sent", () => {
      const result = parse({
        paymentType: "EFECTIVO",
        recipientId: "recipient-sonia",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        // Never persists an efectivo-with-recipient booking.
        expect(result.data.recipientId).toBeUndefined();
      }
    });
  });
});
