import { describe, it, expect } from "vitest";
import { guestSchema } from "@/lib/validations/guest";

const validGuest = {
  firstName: "Juan",
  lastName: "Pérez",
  dni: "30123456",
  phone: "1551234567",
  email: "",
  notes: "",
};

function parse(overrides: Record<string, unknown> = {}) {
  return guestSchema.safeParse({ ...validGuest, ...overrides });
}

describe("guestSchema", () => {
  it("accepts a valid guest with an empty optional email", () => {
    const result = parse();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBeUndefined();
    }
  });

  it("accepts a valid guest with email and notes", () => {
    const result = parse({
      email: "juan@example.com",
      notes: "Prefiere departamento frente al mar",
    });
    expect(result.success).toBe(true);
  });

  describe("dni format (7–8 digits)", () => {
    it("rejects DNI with only 6 digits", () => {
      const result = parse({ dni: "123456" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "dni",
        );
        expect(issue?.message).toMatch(/7 y 8 dígitos/);
      }
    });

    it("rejects DNI with 9 digits", () => {
      const result = parse({ dni: "123456789" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "dni",
        );
        expect(issue?.message).toMatch(/7 y 8 dígitos/);
      }
    });

    it("accepts 7 and 8 digit DNIs", () => {
      expect(parse({ dni: "1234567" }).success).toBe(true);
      expect(parse({ dni: "12345678" }).success).toBe(true);
    });
  });

  describe("email", () => {
    it("rejects invalid email format", () => {
      const result = parse({ email: "no-es-mail" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "email",
        );
        expect(issue?.message).toMatch(/formato válido/);
      }
    });

    it("keeps a valid email and drops an empty one", () => {
      const kept = parse({ email: "juan@example.com" });
      expect(kept.success && kept.data.email).toBe("juan@example.com");
      const dropped = parse({ email: "" });
      expect(dropped.success && dropped.data.email).toBeUndefined();
    });
  });

  describe("required fields declare Spanish errors naming the field", () => {
    it("rejects empty firstName", () => {
      const result = parse({ firstName: " " });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "firstName",
        );
        expect(issue?.message).toBe("El nombre es obligatorio.");
      }
    });

    it("rejects empty lastName", () => {
      const result = parse({ lastName: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "lastName",
        );
        expect(issue?.message).toBe("El apellido es obligatorio.");
      }
    });

    it("rejects empty phone", () => {
      const result = parse({ phone: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "phone",
        );
        expect(issue?.message).toBe("El teléfono es obligatorio.");
      }
    });

    it("rejects empty dni naming the dni field", () => {
      const result = parse({ dni: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        const issue = result.error.issues.find(
          (candidate) => String(candidate.path[0]) === "dni",
        );
        expect(issue?.message).toBe("El DNI es obligatorio.");
      }
    });
  });
});
