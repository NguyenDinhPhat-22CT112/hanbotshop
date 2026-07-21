ALTER TABLE "ProductionJob" DROP CONSTRAINT IF EXISTS "ProductionJob_customRequestId_fkey";

ALTER TABLE "ProductionJob" DROP COLUMN IF EXISTS "customRequestId";

DROP TABLE IF EXISTS "Quote";
DROP TABLE IF EXISTS "CustomRequestFile";
DROP TABLE IF EXISTS "CustomRequest";

DROP TYPE IF EXISTS "QuoteStatus";
DROP TYPE IF EXISTS "CustomRequestStatus";
DROP TYPE IF EXISTS "CustomRequestType";
