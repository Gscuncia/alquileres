"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import {
  expenseSchema,
  expenseTypeSchema,
  type ExpenseInput,
} from "@/lib/validations/expense";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

/**
 * Form normalizer: HTML inputs (type, dates, money) arrive as strings; they
 * are trimmed/coerced here so the zod schema can validate them as the
 * typed shape declared in `expenseSchema`.
 */
function buildExpenseInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  const number = (key: string): number | undefined => {
    const raw = text(key);
    if (raw === "") return undefined;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  return {
    typeId: text("typeId"),
    propertyId: text("propertyId"),
    category: text("category"),
    description: text("description"),
    amount: number("amount"),
    date: text("date"),
  };
}

function collectFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in fieldErrors)) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

function isNameConflict(error: unknown): boolean {
  return (error as { code?: string })?.code === "P2002";
}

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

function revalidateExpensePaths(): void {
  revalidatePath("/admin/gastos");
  revalidatePath("/admin");
}

/**
 * The requiresProperty cross-field rule needs the DB type row; it is fetched
 * once after schema validation and the persisted propertyId is derived from
 * the flag: a requires-property type keeps the selected property, a general
 * type never persists one (even if the form leaked a value).
 */
async function resolveTypeAndProperty(
  parsed: ExpenseInput,
): Promise<
  | { ok: true; expenseTypeId: string; propertyId: string | null }
  | { ok: false; fieldErrors: Record<string, string> }
> {
  const type = await prisma.expenseType.findUnique({
    where: { id: parsed.typeId },
    select: { id: true, requiresProperty: true },
  });

  if (!type) {
    return {
      ok: false,
      fieldErrors: { typeId: "El tipo de gasto no existe." },
    };
  }

  if (type.requiresProperty && !parsed.propertyId) {
    return {
      ok: false,
      fieldErrors: {
        propertyId: "La propiedad es obligatoria para este tipo de gasto.",
      },
    };
  }

  return {
    ok: true,
    expenseTypeId: type.id,
    propertyId: type.requiresProperty ? parsed.propertyId ?? null : null,
  };
}

export async function createExpense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = expenseSchema.safeParse(buildExpenseInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const resolved = await resolveTypeAndProperty(parsed.data);
  if (!resolved.ok) {
    return { ok: false, fieldErrors: resolved.fieldErrors };
  }

  await prisma.expense.create({
    data: {
      propertyId: resolved.propertyId,
      expenseTypeId: resolved.expenseTypeId,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      date: parsed.data.date,
    },
  });

  revalidateExpensePaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateExpense(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Gasto no encontrado." };
  }

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Gasto no encontrado." };
  }

  const parsed = expenseSchema.safeParse(buildExpenseInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  const resolved = await resolveTypeAndProperty(parsed.data);
  if (!resolved.ok) {
    return { ok: false, fieldErrors: resolved.fieldErrors };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      propertyId: resolved.propertyId,
      expenseTypeId: resolved.expenseTypeId,
      category: parsed.data.category,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      date: parsed.data.date,
    },
  });

  revalidateExpensePaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * Delete is a plain form action (no ActionState flow): ConfirmButton
 * submits it and the caller is redirected back to the gastos list.
 */
export async function deleteExpense(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);

  if (id) {
    await prisma.expense.delete({ where: { id } });
    revalidateExpensePaths();
  }

  redirect("/admin/gastos");
}

/**
 * Expense-type CRUD: the form's checkbox is normalized to a boolean here,
 * and a duplicate name surfaces as P2002 mapped to a Spanish field error.
 */
function buildExpenseTypeInput(formData: FormData): Record<string, unknown> {
  const text = (key: string): string => {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
  };

  return {
    name: text("name"),
    requiresProperty: formData.get("requiresProperty") === "on",
  };
}

export async function createExpenseType(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const parsed = expenseTypeSchema.safeParse(buildExpenseTypeInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    await prisma.expenseType.create({ data: parsed.data });
  } catch (error) {
    if (isNameConflict(error)) {
      return {
        ok: false,
        fieldErrors: { name: "El tipo de gasto ya existe." },
      };
    }
    throw error;
  }

  revalidateExpensePaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

export async function updateExpenseType(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();

  const id = readId(formData);
  if (!id) {
    return { ok: false, message: "Tipo de gasto no encontrado." };
  }

  const existing = await prisma.expenseType.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Tipo de gasto no encontrado." };
  }

  const parsed = expenseTypeSchema.safeParse(buildExpenseTypeInput(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: collectFieldErrors(parsed.error) };
  }

  try {
    // Keeping `id` out of the payload is fine: Prisma still enforces the
    // unique name on update, so a duplicate surfaces as P2002 here too.
    await prisma.expenseType.update({ where: { id }, data: parsed.data });
  } catch (error) {
    if (isNameConflict(error)) {
      return {
        ok: false,
        fieldErrors: { name: "El tipo de gasto ya existe." },
      };
    }
    throw error;
  }

  revalidateExpensePaths();
  return { ok: true, message: ACTION_SUCCESS_MESSAGE };
}

/**
 * A type referenced by at least one expense is blocked at action level (the
 * Restrict FK on Expense→ExpenseType backs it up at DB level) and surfaces
 * as an error banner on the gastos list.
 */
export async function deleteExpenseType(formData: FormData): Promise<void> {
  await requireAdminForAction();

  const id = readId(formData);

  if (id) {
    const expensesCount = await prisma.expense.count({
      where: { expenseTypeId: id },
    });

    if (expensesCount > 0) {
      redirect("/admin/gastos?error=tipo-gastos");
      // Unreachable in Next (redirect throws); keeps mock-based tests honest.
      return;
    }

    await prisma.expenseType.delete({ where: { id } });
    revalidateExpensePaths();
  }

  redirect("/admin/gastos");
}
