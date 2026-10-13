-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "allowedTabs" TEXT[],
    "isDefaultAdmin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- SeedDefaultRoles
INSERT INTO "roles" ("id", "name", "allowedTabs", "isDefaultAdmin", "created_at", "updated_at") VALUES
('role_admin_default', 'Administrador', ARRAY['panel','calendario','propiedades','reservas','huespedes','destinatarios','gastos'], true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('role_operative_default', 'Gestion diaria', ARRAY['calendario','gastos'], false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable
ALTER TABLE "users" ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "role_id" TEXT;

-- MapExistingUsersToDefaultRoles
UPDATE "users" SET "role_id" = 'role_admin_default' WHERE "role" = 'ADMIN'::"Role";
UPDATE "users" SET "role_id" = 'role_operative_default' WHERE "role" = 'OPERATIVE'::"Role";

-- Make role_id required now that existing users have been mapped
ALTER TABLE "users" ALTER COLUMN "role_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropOldRoleEnumColumnAndType
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "Role";
