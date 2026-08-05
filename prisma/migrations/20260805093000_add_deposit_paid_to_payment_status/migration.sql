-- AlterEnum
-- Add DEPOSIT_PAID to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE 'DEPOSIT_PAID';

-- Note: This migration adds DEPOSIT_PAID as a new payment status value
-- It will be positioned between PARTIALLY_PAID and PAID in the enum
-- Existing data will not be affected - manual updates needed if you want to
-- set existing orders with status=DEPOSIT_PAID to paymentStatus=DEPOSIT_PAID
