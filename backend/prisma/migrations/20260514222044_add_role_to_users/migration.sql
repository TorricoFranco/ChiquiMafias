-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'PREMIUM', 'MODERATOR', 'ADMIN');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER';
