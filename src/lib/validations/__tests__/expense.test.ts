import { describe, it, expect } from "vitest";
import { expenseSchema } from "@/lib/validations/expense";
import { toUtc } from "@/lib/datetime";

const validExpense = {
  type: "MANTENIMIENTO",
  propertyId: "p-1",
  category: "Plomería",
  description: "Cambio de grifería en el baño",
  amount: 150,
  date: "2026-10-03",
};

describe("expenseSchema", () => {
  it("parses a valid maintenance expense and builds the UTC-3 instant", () => {
    const parsed = expenseSchema.safeParse(validExpense);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("MANTENIMIENTO");
      expect(parsed.data.propertyId).toBe("p-1");
      // Free text category persists verbatim.
      expect(parsed.data.category).toBe("Plomería");
      expect(parsed.data.date.getTime()).toBe(
        toUtc("2026-10-03", "00:00").getTime(),
      );
    }
  });

  it("rejects MANTENIMIENTO without a property, in Spanish, naming the field", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      propertyId: "",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "propertyId");
      expect(issue?.message).toMatch(/mantenimiento.*propiedad|propiedad/i);
    }
  });

  it("clears the property for CONSORCIO: a consorcio expense is never persisted with a property", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      type: "CONSORCIO",
      propertyId: "p-1",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe("CONSORCIO");
      expect(parsed.data.propertyId).toBeUndefined();
    }
  });

  it("rejects a negative amount, in Spanish", () => {
    const parsed = expenseSchema.safeParse({ ...validExpense, amount: -5 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "amount");
      expect(issue?.message).toMatch(/importe/i);
    }
  });

  it("rejects amount = 0", () => {
    const parsed = expenseSchema.safeParse({ ...validExpense, amount: 0 });

    expect(parsed.success).toBe(false);
  });

  it("rejects an empty category, in Spanish, naming the field", () => {
    const parsed = expenseSchema.safeParse({ ...validExpense, category: "  " });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "category");
      expect(issue?.message).toMatch(/categoría/i);
    }
  });

  it("rejects an unknown type", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      type: "OTRO",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "type");
      expect(issue?.message).toMatch(/tipo/i);
    }
  });

  it("rejects an invalid date, in Spanish, naming the field", () => {
    const parsed = expenseSchema.safeParse({ ...validExpense, date: "12/10/2026" });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "date");
      expect(issue?.message).toMatch(/fecha/i);
    }
  });

  it("marks an empty description as omitted", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      description: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.description).toBeUndefined();
    }
  });
});
