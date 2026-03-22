-- AlterTable
ALTER TABLE "LevelReward" ADD COLUMN     "ingameClaimed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ingameClaimedAt" TIMESTAMP(3),
ADD COLUMN     "ingameClaimedBy" TEXT,
ADD COLUMN     "isIngame" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LevelReward_isIngame_ingameClaimed_idx" ON "LevelReward"("isIngame", "ingameClaimed");
