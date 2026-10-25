-- Migration: holidays
-- Admin-configured holidays (Feriados tab) annotated in the admin calendar.
-- One row per calendar date: `date` is unique and `notes` is the
-- observaciones description shown on the calendar day cell.

-- CreateTable
CREATE TABLE "holidays" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "holidays_date_key" ON "holidays"("date");
