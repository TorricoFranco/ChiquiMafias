/*
  Warnings:

  - The values [CHAT_BUBBL] on the enum `ItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ItemType_new" AS ENUM ('STICKER_PACK', 'NAME_COLOR', 'BANNER', 'CHAT_BUBBLE', 'MEGAPHONE', 'CUSTOM_POLL');
ALTER TABLE "StoreItem" ALTER COLUMN "type" TYPE "ItemType_new" USING ("type"::text::"ItemType_new");
ALTER TABLE "StoreDiscount" ALTER COLUMN "targetType" TYPE "ItemType_new" USING ("targetType"::text::"ItemType_new");
ALTER TYPE "ItemType" RENAME TO "ItemType_old";
ALTER TYPE "ItemType_new" RENAME TO "ItemType";
DROP TYPE "public"."ItemType_old";
COMMIT;
