"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForAction } from "@/lib/require-admin";
import { expenseSchema, type ExpenseInput } from "@/lib/validations/expense";
import {
  ACTION_SUCCESS_MESSAGE,
  type ActionState,
} from "@/lib/admin-action-types";

/**
 * Form normalizer: HTML inputs (type, dates, money) arrive as strings; they
 * are trimmed/coerced here so the zod schema can validate the typed shape
 * declared in `expenseSchema`.
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
    type: text("type") as "MANTENIMIENTO" | "CONSORCIO",
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

function readId(formData: FormData): string {
  const value = formData.get("id");
  return typeof value === "string" ? value.trim() : "";
}

function revalidateExpensePaths(): void {
  revalidatePath("/admin/gastos");
  revalidatePath("/admin");
}

function toPrismaData(data: ExpenseInput) {
  return {
    propertyId: data.propertyId ?? null,
    type: data.type,
    category: data.category,
    description: data.description ?? null,
    amount: data.amount,
    date: data.date,
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

  await prisma.expense.create({ data: toPrismaData(parsed.data) });

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

  await prisma.expense.update({
    where: { id },
    data: toPrismaData(parsed.data),
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
