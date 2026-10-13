-- Migration: expense_types
-- Expense types table replaces the `expenses.type` enum. Self-contained and
-- deploy-safe: the seed rows and the backfill run BEFORE any destructive
-- step, and a RAISE EXCEPTION guard aborts the migration when any expense
-- would end up without a mapped type (unmapped legacy enum value or NULL).

-- CreateTable
CREATE TABLE "expense_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requires_property" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "expense_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_types_name_key" ON "expense_types"("name");

-- AlterTable: expense_type_id is added NULLABLE first so legacy rows exist
-- while the backfill assigns types.
ALTER TABLE "expenses" ADD COLUMN "expense_type_id" TEXT;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_type_id_fkey" FOREIGN KEY ("expense_type_id") REFERENCES "expense_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "expenses_expense_type_id_idx" ON "expenses"("expense_type_id");

-- Seed rows (inside the migration so a prod `migrate deploy` is
-- self-contained). Re-running is safe via ON CONFLICT DO NOTHING.
INSERT INTO "expense_types" ("id", "name", "requires_property")
VALUES ('expense_type_' || gen_random_uuid()::text, 'Mantenimiento', true),
       ('expense_type_' || gen_random_uuid()::text, 'Consorcio', false)
ON CONFLICT ("name") DO NOTHING;

-- Backfill: map the legacy enum to its seeded type row.
UPDATE "expenses"
SET "expense_type_id" = (
    SELECT t."id" FROM "expense_types" t
    WHERE t."name" = CASE "type"
        WHEN 'MANTENIMIENTO' THEN 'Mantenimiento'
        WHEN 'CONSORCIO' THEN 'Consorcio'
    END
);

-- Guard: abort BEFORE any destructive step if an expense was left unmapped
-- (only the two known enum values exist; NULL mapping must never happen).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "expenses" WHERE "expense_type_id" IS NULL) THEN
        RAISE EXCEPTION 'Migración expense_types: hay gastos sin tipo asignado (valor de enum no mapeado). Revise los datos antes de volver a aplicar.';
    END IF;
END
$$;

-- Only now the column can be made required and the legacy enum dropped.
ALTER TABLE "expenses" ALTER COLUMN "expense_type_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "type";

-- DropEnum
DROP TYPE "ExpenseType";
