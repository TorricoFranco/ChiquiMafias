/*
  Warnings:

  - Added the required column `type` to the `GlobalAnnouncement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotifyType" ADD VALUE 'MATCH_STARTING';
ALTER TYPE "NotifyType" ADD VALUE 'STORE_NEW_CONTENT';
ALTER TYPE "NotifyType" ADD VALUE 'SYSTEM_ALERT';

-- DropIndex
DROP INDEX "Notification_userId_readAt_idx";

-- AlterTable
ALTER TABLE "GlobalAnnouncement" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "referenceId" TEXT,
ADD COLUMN     "type" "NotifyType" NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "GlobalAnnouncement_createdAt_idx" ON "GlobalAnnouncement"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt" DESC);
