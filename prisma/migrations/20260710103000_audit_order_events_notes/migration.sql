CREATE TYPE "AuditAction" AS ENUM (
  'CREATE',
  'UPDATE',
  'DELETE',
  'ARCHIVE',
  'CANCEL',
  'STATUS_CHANGE',
  'PAYMENT_STATUS_CHANGE',
  'TRACKING_UPDATE',
  'NOTE_ADDED'
);

CREATE TYPE "OrderEventType" AS ENUM (
  'ORDER_CREATED',
  'STATUS_CHANGED',
  'PAYMENT_STATUS_CHANGED',
  'TRACKING_UPDATED',
  'ORDER_CANCELLED',
  'ADMIN_NOTE_ADDED',
  'PAYMENT_NOTE_ADDED'
);

CREATE TYPE "OrderNoteType" AS ENUM ('GENERAL', 'PAYMENT', 'CONTACT');

CREATE TABLE "OrderEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "OrderEventType" NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrderNote" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "OrderNoteType" NOT NULL DEFAULT 'GENERAL',
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OrderNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" "AuditAction" NOT NULL,
  "resourceType" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "before" JSONB,
  "after" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderEvent_orderId_createdAt_idx" ON "OrderEvent"("orderId", "createdAt");
CREATE INDEX "OrderNote_orderId_createdAt_idx" ON "OrderNote"("orderId", "createdAt");
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "AuditLog"("resourceType", "resourceId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

ALTER TABLE "OrderEvent"
ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderNote"
ADD CONSTRAINT "OrderNote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
