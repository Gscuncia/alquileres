import { describe, it, expect } from "vitest";
import { expenseSchema, expenseTypeSchema } from "@/lib/validations/expense";
import { toUtc } from "@/lib/datetime";

const validExpense = {
  typeId: "t-1",
  propertyId: "p-1",
  category: "Plomería",
  description: "Cambio de grifería en el baño",
  amount: 150,
  date: "2026-10-03",
};

describe("expenseSchema", () => {
  it("parses a valid expense carrying its type id and builds the UTC-3 instant", () => {
    const parsed = expenseSchema.safeParse(validExpense);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.typeId).toBe("t-1");
      expect(parsed.data.propertyId).toBe("p-1");
      // Free text category persists verbatim.
      expect(parsed.data.category).toBe("Plomería");
      expect(parsed.data.date.getTime()).toBe(
        toUtc("2026-10-03", "00:00").getTime(),
      );
    }
  });

  it("rejects an empty typeId, in Spanish, naming the field", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      typeId: "  ",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "typeId");
      expect(issue?.message).toBe("El tipo de gasto es obligatorio.");
    }
  });

  it("accepts a missing propertyId (the action decides via the type flag)", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      propertyId: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // No cross-field enum logic left in the schema: propertyId stays as
      // submitted (undefined) for the action to keep or clear.
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

  it("accepts any string typeId (type existence is checked at the action)", () => {
    const parsed = expenseSchema.safeParse({
      ...validExpense,
      typeId: "unknown-type-id",
    });

    expect(parsed.success).toBe(true);
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

describe("expenseTypeSchema", () => {
  it("parses a name with the requiresProperty flag", () => {
    const parsed = expenseTypeSchema.safeParse({
      name: "Mantenimiento",
      requiresProperty: true,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        name: "Mantenimiento",
        requiresProperty: true,
      });
    }
  });

  it("rejects an empty name, in Spanish, naming the field", () => {
    const parsed = expenseTypeSchema.safeParse({
      name: "   ",
      requiresProperty: false,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find((i) => i.path[0] === "name");
      expect(issue?.message).toMatch(/nombre/i);
    }
  });

  it("rejects a non-boolean requiresProperty", () => {
    const parsed = expenseTypeSchema.safeParse({
      name: "Consorcio",
      requiresProperty: "si",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(
        (i) => i.path[0] === "requiresProperty",
      );
      expect(issue?.message).toMatch(/propiedad/i);
    }
  });
});
