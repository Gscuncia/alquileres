ALTER TABLE "bookings" ADD COLUMN "deposit_payment_type" "PaymentType" NOT NULL DEFAULT 'EFECTIVO';
ALTER TABLE "bookings" ADD COLUMN "deposit_payment_method" TEXT;
ALTER TABLE "bookings" ADD COLUMN "deposit_transfer_recipient_id" TEXT;
ALTER TABLE "bookings" ADD COLUMN "rest_payment_type" "PaymentType" NOT NULL DEFAULT 'EFECTIVO';
ALTER TABLE "bookings" ADD COLUMN "rest_transfer_recipient_id" TEXT;

-- Existing single-payment data maps onto the deposit part
UPDATE "bookings" SET "deposit_payment_type" = "payment_type",
                      "deposit_payment_method" = "payment_method",
                      "deposit_transfer_recipient_id" = "transfer_recipient_id";

ALTER TABLE "bookings" ADD CONSTRAINT "bookings_deposit_transfer_recipient_id_fkey" FOREIGN KEY ("deposit_transfer_recipient_id") REFERENCES "transfer_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_rest_transfer_recipient_id_fkey" FOREIGN KEY ("rest_transfer_recipient_id") REFERENCES "transfer_recipients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "bookings" DROP COLUMN "payment_type";
ALTER TABLE "bookings" DROP COLUMN "payment_method";
ALTER TABLE "bookings" DROP COLUMN "transfer_recipient_id";
