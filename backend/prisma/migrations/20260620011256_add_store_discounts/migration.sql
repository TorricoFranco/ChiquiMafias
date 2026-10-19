-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'BY_TYPE', 'SPECIFIC_ITEM');

-- CreateTable
CREATE TABLE "StoreDiscount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" INTEGER NOT NULL,
    "scope" "DiscountScope" NOT NULL,
    "targetType" "ItemType",
    "targetItemId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreDiscount_startDate_endDate_idx" ON "StoreDiscount"("startDate", "endDate");

-- AddForeignKey
ALTER TABLE "StoreDiscount" ADD CONSTRAINT "StoreDiscount_targetItemId_fkey" FOREIGN KEY ("targetItemId") REFERENCES "StoreItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
