-- CreateEnum
CREATE TYPE "MarketType" AS ENUM ('MATCH', 'CUSTOM');

-- AlterTable
ALTER TABLE "Market" ADD COLUMN     "category" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" "MarketType" NOT NULL DEFAULT 'MATCH';
