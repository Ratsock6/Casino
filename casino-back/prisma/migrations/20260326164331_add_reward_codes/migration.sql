-- CreateTable
CREATE TABLE "RewardCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "rewardType" TEXT NOT NULL,
    "rewardValue" TEXT NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCodeUse" (
    "id" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardCodeUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardCode_code_key" ON "RewardCode"("code");

-- CreateIndex
CREATE INDEX "RewardCode_code_idx" ON "RewardCode"("code");

-- CreateIndex
CREATE INDEX "RewardCode_isActive_idx" ON "RewardCode"("isActive");

-- CreateIndex
CREATE INDEX "RewardCodeUse_userId_idx" ON "RewardCodeUse"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardCodeUse_codeId_userId_key" ON "RewardCodeUse"("codeId", "userId");

-- AddForeignKey
ALTER TABLE "RewardCodeUse" ADD CONSTRAINT "RewardCodeUse_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "RewardCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardCodeUse" ADD CONSTRAINT "RewardCodeUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
