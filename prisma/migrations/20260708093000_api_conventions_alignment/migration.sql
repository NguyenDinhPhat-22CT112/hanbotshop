CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "ProductionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "FileUploadStatus" AS ENUM ('PENDING', 'CONFIRMED');

ALTER TABLE "Category"
ADD COLUMN "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "PaymentEvent"
ADD COLUMN "providerEventId" TEXT;

ALTER TABLE "ProductionJob"
ADD COLUMN "assigneeId" TEXT,
ADD COLUMN "priority" "ProductionPriority" NOT NULL DEFAULT 'NORMAL';

ALTER TABLE "File"
ADD COLUMN "uploadStatus" "FileUploadStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "confirmedAt" TIMESTAMP(3);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "actorId" TEXT,
  "requestHash" TEXT NOT NULL,
  "responseStatus" INTEGER,
  "responseBody" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentEvent_providerEventId_key" ON "PaymentEvent"("providerEventId");
CREATE UNIQUE INDEX "IdempotencyRecord_scope_key_key" ON "IdempotencyRecord"("scope", "key");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
