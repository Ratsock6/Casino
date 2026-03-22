-- CreateTable
CREATE TABLE "PlayerLevel" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "currentXp" BIGINT NOT NULL DEFAULT 0,
    "totalXp" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LevelReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "rewardType" TEXT NOT NULL,
    "rewardValue" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LevelReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerLevel_userId_key" ON "PlayerLevel"("userId");

-- CreateIndex
CREATE INDEX "PlayerLevel_userId_idx" ON "PlayerLevel"("userId");

-- CreateIndex
CREATE INDEX "PlayerLevel_level_idx" ON "PlayerLevel"("level");

-- CreateIndex
CREATE INDEX "LevelReward_userId_level_idx" ON "LevelReward"("userId", "level");

-- AddForeignKey
ALTER TABLE "PlayerLevel" ADD CONSTRAINT "PlayerLevel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LevelReward" ADD CONSTRAINT "LevelReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlayerLevel"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
