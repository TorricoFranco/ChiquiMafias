/*
  Warnings:

  - You are about to drop the column `team_id` on the `Users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Users" DROP CONSTRAINT "Users_team_id_fkey";

-- DropIndex
DROP INDEX "Users_team_id_idx";

-- AlterTable
ALTER TABLE "Users" DROP COLUMN "team_id",
ADD COLUMN     "team" TEXT;
