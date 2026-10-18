-- CreateEnum
CREATE TYPE "CoinOrderStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "coin_packs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "coinsAmount" INTEGER NOT NULL,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "priceARS" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coin_orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "status" "CoinOrderStatus" NOT NULL DEFAULT 'PENDING',
    "finalPriceARS" DOUBLE PRECISION NOT NULL,
    "coinsToCredit" INTEGER NOT NULL,
    "mpExternalRef" TEXT NOT NULL,
    "mpPreferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_orders_mpExternalRef_key" ON "coin_orders"("mpExternalRef");

-- CreateIndex
CREATE INDEX "coin_orders_userId_idx" ON "coin_orders"("userId");

-- CreateIndex
CREATE INDEX "coin_orders_mpExternalRef_idx" ON "coin_orders"("mpExternalRef");

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coin_orders" ADD CONSTRAINT "coin_orders_packId_fkey" FOREIGN KEY ("packId") REFERENCES "coin_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
