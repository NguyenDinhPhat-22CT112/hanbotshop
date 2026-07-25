ALTER TABLE "User"
  ADD COLUMN "adminSessionId" TEXT,
  ADD COLUMN "adminSessionLastActiveAt" TIMESTAMP(3);
