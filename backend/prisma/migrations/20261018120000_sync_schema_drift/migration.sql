-- CreateEnum
CREATE TYPE "PollType" AS ENUM ('CLASSIC', 'VERSUS', 'MATCH', 'RATING', 'RANKING', 'FACTO', 'NEWS', 'INFO');

-- CreateEnum
CREATE TYPE "PricedEntity" AS ENUM ('COIN_PACK', 'STORE_ITEM', 'SUBSCRIPTION_PLAN');

-- CreateEnum
CREATE TYPE "PriceCurrency" AS ENUM ('ARS', 'COINS');

-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "commentsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "config" JSONB,
ADD COLUMN     "createdByAdminId" TEXT,
ADD COLUMN     "isOfficial" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ticketCost" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "ticketRefund" JSONB,
ADD COLUMN     "type" "PollType" NOT NULL DEFAULT 'CLASSIC';

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "ranking" INTEGER[];

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsVersion" TEXT;

-- CreateTable
CREATE TABLE "price_change_logs" (
    "id" TEXT NOT NULL,
    "entity" "PricedEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "oldPrice" DOUBLE PRECISION NOT NULL,
    "newPrice" DOUBLE PRECISION NOT NULL,
    "currency" "PriceCurrency" NOT NULL,
    "changedById" TEXT,
    "changedByUsername" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_change_logs_createdAt_idx" ON "price_change_logs"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "price_change_logs_entity_entityId_idx" ON "price_change_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "price_change_logs_changedById_idx" ON "price_change_logs"("changedById");

-- CreateIndex
CREATE INDEX "Poll_status_type_idx" ON "Poll"("status", "type");

-- CreateIndex
CREATE INDEX "Poll_createdByAdminId_idx" ON "Poll"("createdByAdminId");

-- AddForeignKey
ALTER TABLE "Poll" ADD CONSTRAINT "Poll_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_logs" ADD CONSTRAINT "price_change_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

