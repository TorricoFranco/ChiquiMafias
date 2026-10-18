-- AlterTable
ALTER TABLE "MatchLineup" ADD COLUMN     "kit_colors" JSONB,
ADD COLUMN     "team_logo" TEXT;

-- AlterTable
ALTER TABLE "MatchPlayer" ADD COLUMN     "number" TEXT;
