-- Migration: guests
-- Guests table + bookings.guest_id FK with data backfill from the legacy
-- booking client columns. Self-contained and deploy-safe: the backfill runs
-- BEFORE any destructive step, and a RAISE EXCEPTION guard aborts the
-- migration when any booking would end up without a guest.

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "notes" TEXT,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guests_dni_key" ON "guests"("dni");

-- AlterTable: guest_id is added NULLABLE first so legacy rows exist while
-- the backfill assigns guests.
ALTER TABLE "bookings" ADD COLUMN "guest_id" TEXT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one guest per distinct DNI (first booking's data wins; the row
-- with an email is preferred). Re-running is safe via ON CONFLICT DO NOTHING.
INSERT INTO "guests" ("id", "first_name", "last_name", "dni", "phone", "email")
SELECT 'guest_' || gen_random_uuid()::text,
       b."first_name",
       b."last_name",
       b."dni",
       b."phone",
       b."email"
FROM (
    SELECT DISTINCT ON ("dni") "first_name", "last_name", "dni", "phone", "email"
    FROM "bookings"
    WHERE "dni" <> ''
    ORDER BY "dni", "email" DESC NULLS LAST
) b
ON CONFLICT ("dni") DO NOTHING;

-- Link every booking to the guest sharing its legacy DNI.
UPDATE "bookings" b
SET "guest_id" = g."id"
FROM "guests" g
WHERE b."dni" = g."dni";

-- Guard: abort BEFORE any destructive step if a booking was left unmapped
-- (e.g. a booking whose DNI is empty — no guest could be derived from it).
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM "bookings" WHERE "guest_id" IS NULL) THEN
        RAISE EXCEPTION 'Migración guests: hay reservas sin huésped asignado (DNI vacío o sin coincidencia). Revise los datos antes de volver a aplicar.';
    END IF;
END
$$;

-- Only now the column can be made required and the legacy fields dropped.
ALTER TABLE "bookings" ALTER COLUMN "guest_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "dni",
DROP COLUMN "email",
DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "phone";

-- CreateIndex
CREATE INDEX "bookings_guest_id_idx" ON "bookings"("guest_id");
