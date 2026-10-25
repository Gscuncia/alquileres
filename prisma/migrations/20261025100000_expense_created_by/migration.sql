ALTER TABLE "expenses" ADD COLUMN "created_by_user_id" TEXT;

-- Foreign key: the admin user who loaded the expense (NextAuth users are
-- Prisma-managed in this project). SetNull keeps historical expenses valid
-- if the user is ever deleted; the column is nullable for legacy rows.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
