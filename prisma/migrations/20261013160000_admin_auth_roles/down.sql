-- Reverse the migration: restore the old Role enum and role column.

-- Add back the enum and the role column
CREATE TYPE "Role" AS ENUM ('ADMIN', 'OPERATIVE');
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'OPERATIVE';

-- Map default roles back to enum values
UPDATE "users" SET "role" = 'ADMIN'::"Role" WHERE "role_id" = 'role_admin_default';
UPDATE "users" SET "role" = 'OPERATIVE'::"Role" WHERE "role_id" = 'role_operative_default';

-- Remove new columns and foreign key
ALTER TABLE "users" DROP CONSTRAINT "users_role_id_fkey";
ALTER TABLE "users" DROP COLUMN "role_id";
ALTER TABLE "users" DROP COLUMN "first_name";
ALTER TABLE "users" DROP COLUMN "last_name";
ALTER TABLE "users" DROP COLUMN "must_change_password";

-- Remove new tables and seed rows
DROP TABLE "password_reset_tokens";
DELETE FROM "roles" WHERE "name" IN ('Administrador', 'Gestion diaria');
DROP TABLE "roles";
