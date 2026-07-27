CREATE TYPE "OrderType" AS ENUM ('ORDER', 'RESIN');

ALTER TABLE "Order"
  ADD COLUMN "type" "OrderType" NOT NULL DEFAULT 'ORDER',
  ADD COLUMN "secondPaymentRequired" DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE "Order" AS orders
SET "type" = 'RESIN'
WHERE EXISTS (
  SELECT 1
  FROM "OrderItem" AS items
  LEFT JOIN "Product" AS products ON products."id" = items."productId"
  LEFT JOIN "Category" AS categories ON categories."id" = products."categoryId"
  LEFT JOIN "ProductTag" AS product_tags ON product_tags."productId" = products."id"
  LEFT JOIN "Tag" AS tags ON tags."id" = product_tags."tagId"
  WHERE items."orderId" = orders."id"
    AND (
      categories."placement" = 'RESIN'
      OR lower(tags."slug") = 'resin'
      OR lower(COALESCE(items."productSnapshot"->>'slug', '')) LIKE '%resin%'
    )
);

ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
CREATE TYPE "OrderStatus" AS ENUM (
  'WAITING_DEPOSIT',
  'DEPOSIT_PAID',
  'WAITING_SECOND_PAYMENT',
  'SECOND_PAYMENT_PAID',
  'SHIPPING',
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'WAITING_PAYMENT',
  'PAID',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED',
  'BLOCKED'
);

ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
  ALTER COLUMN "status" TYPE "OrderStatus"
  USING (
    CASE
      WHEN "type" = 'ORDER' THEN
        CASE
          WHEN "status"::text = 'COMPLETED' THEN 'COMPLETED'
          WHEN "status"::text IN ('CANCELLED', 'REFUNDED') THEN 'CANCELLED'
          WHEN "status"::text = 'BLOCKED' THEN 'BLOCKED'
          WHEN "status"::text = 'SHIPPED' THEN 'SHIPPING'
          WHEN "paidAmount" >= "total" AND "total" > 0 THEN 'SECOND_PAYMENT_PAID'
          WHEN "status"::text = 'PAID' THEN 'SECOND_PAYMENT_PAID'
          WHEN "paidAmount" >= "depositRequired" AND "paidAmount" > 0 THEN 'DEPOSIT_PAID'
          WHEN "status"::text IN ('IN_PRODUCTION', 'READY_TO_SHIP') THEN 'DEPOSIT_PAID'
          ELSE 'WAITING_DEPOSIT'
        END
      ELSE
        CASE
          WHEN "status"::text = 'REFUNDED' THEN 'CANCELLED'
          WHEN "status"::text = 'DRAFT' THEN 'PENDING_CONFIRMATION'
          ELSE "status"::text
        END
    END
  )::"OrderStatus";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'WAITING_DEPOSIT';
DROP TYPE "OrderStatus_old";

ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID');

ALTER TABLE "Order" ALTER COLUMN "paymentStatus" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order"
  ALTER COLUMN "paymentStatus" TYPE "PaymentStatus"
  USING (
    CASE WHEN "paymentStatus"::text = 'REFUNDED' THEN 'UNPAID' ELSE "paymentStatus"::text END
  )::"PaymentStatus";
ALTER TABLE "Payment"
  ALTER COLUMN "status" TYPE "PaymentStatus"
  USING (
    CASE WHEN "status"::text = 'REFUNDED' THEN 'UNPAID' ELSE "status"::text END
  )::"PaymentStatus";
ALTER TABLE "Order" ALTER COLUMN "paymentStatus" SET DEFAULT 'UNPAID';
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'UNPAID';
DROP TYPE "PaymentStatus_old";

ALTER TYPE "PaymentEventType" RENAME TO "PaymentEventType_old";
CREATE TYPE "PaymentEventType" AS ENUM (
  'CHECKOUT_CREATED',
  'CALLBACK_RECEIVED',
  'WEBHOOK_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_FAILED'
);
ALTER TABLE "PaymentEvent"
  ALTER COLUMN "type" TYPE "PaymentEventType"
  USING (
    CASE WHEN "type"::text = 'REFUND_CONFIRMED' THEN 'PAYMENT_FAILED' ELSE "type"::text END
  )::"PaymentEventType";
DROP TYPE "PaymentEventType_old";

CREATE INDEX "Order_type_status_createdAt_idx" ON "Order"("type", "status", "createdAt");
