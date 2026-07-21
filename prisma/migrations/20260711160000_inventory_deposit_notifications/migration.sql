CREATE TYPE "PaymentRequirement" AS ENUM ('FULL', 'DEPOSIT');
CREATE TYPE "NotificationType" AS ENUM ('ORDER_CREATED', 'PAYMENT_CONFIRMED', 'ORDER_STATUS_CHANGED');
CREATE TYPE "EmailOutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

ALTER TABLE "Product"
  ADD COLUMN "paymentRequirement" "PaymentRequirement" NOT NULL DEFAULT 'FULL',
  ADD COLUMN "depositPercent" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ProductVariant"
  ADD COLUMN "inventoryQuantity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "trackInventory" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Order"
  ADD COLUMN "depositRequired" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "OrderItem"
  ADD COLUMN "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "inventoryCommitted" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Product" ADD CONSTRAINT "Product_depositPercent_check" CHECK ("depositPercent" BETWEEN 1 AND 100);
ALTER TABLE "Product" ADD CONSTRAINT "Product_inventoryQuantity_check" CHECK ("inventoryQuantity" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_inventoryQuantity_check" CHECK ("inventoryQuantity" >= 0);
ALTER TABLE "Order" ADD CONSTRAINT "Order_paidAmount_check" CHECK ("paidAmount" >= 0 AND "paidAmount" <= "total");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailOutbox" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "orderId" TEXT,
  "to" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "html" TEXT NOT NULL,
  "status" "EmailOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "dedupeKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailOutbox_dedupeKey_key" ON "EmailOutbox"("dedupeKey");
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailOutbox" ADD CONSTRAINT "EmailOutbox_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
