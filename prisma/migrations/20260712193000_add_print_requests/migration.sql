CREATE TYPE "PrintRequestStatus" AS ENUM ('NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'REJECTED', 'COMPLETED');

CREATE TABLE "PrintRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "customerName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "modelName" TEXT NOT NULL,
  "scale" TEXT,
  "dimensions" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "material" TEXT,
  "color" TEXT,
  "note" TEXT,
  "imageUrls" TEXT[],
  "status" "PrintRequestStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PrintRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrintRequest_userId_createdAt_idx" ON "PrintRequest"("userId", "createdAt");
CREATE INDEX "PrintRequest_status_createdAt_idx" ON "PrintRequest"("status", "createdAt");
ALTER TABLE "PrintRequest" ADD CONSTRAINT "PrintRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
