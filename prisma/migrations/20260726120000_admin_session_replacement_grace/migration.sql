ALTER TABLE "User"
  ADD COLUMN "adminPreviousSessionId" TEXT,
  ADD COLUMN "adminPreviousSessionUntil" TIMESTAMP(3);
