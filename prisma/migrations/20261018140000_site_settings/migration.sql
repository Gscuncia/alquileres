-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "inquiryEmail" TEXT NOT NULL DEFAULT '',
    "whatsappPhone" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the singleton row with the current hardcoded destinations
INSERT INTO "site_settings" ("id", "inquiryEmail", "whatsappPhone", "updatedAt")
VALUES ('default', 'contacto@alquileresanita.com.ar', '5491155052228', CURRENT_TIMESTAMP);
