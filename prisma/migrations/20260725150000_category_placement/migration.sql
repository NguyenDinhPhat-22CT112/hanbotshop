CREATE TYPE "CategoryPlacement" AS ENUM ('ORDER', 'RESIN', 'BOTH');

ALTER TABLE "Category"
  ADD COLUMN "placement" "CategoryPlacement" NOT NULL DEFAULT 'BOTH';
