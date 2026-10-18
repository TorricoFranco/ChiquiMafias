-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckIn" TIMESTAMP(3),
ADD COLUMN     "streakRewardClaimed" BOOLEAN NOT NULL DEFAULT true;
