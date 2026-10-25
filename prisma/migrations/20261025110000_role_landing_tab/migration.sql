-- Migration: role_landing_tab
-- Per-role landing tab: which admin tab becomes visible right after login.
-- Nullable; NULL means the default landing (the /admin panel).

-- AlterTable
ALTER TABLE "roles" ADD COLUMN "landingTab" TEXT;
