import { describe, it, expect } from "vitest";
import { recipientSchema } from "@/lib/validations/recipient";

describe("recipientSchema", () => {
  it("accepts a valid name", () => {
    const result = recipientSchema.safeParse({ name: "Sonia" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Sonia");
    }
  });

  it("rejects an empty name with the field message", () => {
    const result = recipientSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) => String(candidate.path[0]) === "name",
      );
      expect(issue?.message).toMatch(
        /El nombre del destinatario es obligatorio/,
      );
    }
  });

  it("rejects a whitespace-only name", () => {
    expect(recipientSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("trims surrounding whitespace", () => {
    const result = recipientSchema.safeParse({ name: "  Pablo  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Pablo");
    }
  });

  it("rejects a missing name", () => {
    const result = recipientSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find(
        (candidate) => String(candidate.path[0]) === "name",
      );
      expect(issue?.message).toMatch(/obligatorio/);
    }
  });
});
