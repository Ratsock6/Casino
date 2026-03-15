-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('ROULETTE', 'BLACKJACK', 'SLOTS');

-- CreateEnum
CREATE TYPE "GameRoundStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "status" "GameRoundStatus" NOT NULL DEFAULT 'PENDING',
    "stake" BIGINT NOT NULL,
    "payout" BIGINT NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION,
    "metadata" JSONB,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRound_userId_createdAt_idx" ON "GameRound"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameRound_gameType_status_createdAt_idx" ON "GameRound"("gameType", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
