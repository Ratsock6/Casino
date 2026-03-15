-- CreateEnum
CREATE TYPE "BlackjackGameStatus" AS ENUM ('PLAYER_TURN', 'DEALER_TURN', 'PLAYER_BUST', 'DEALER_BUST', 'PLAYER_BLACKJACK', 'PLAYER_WIN', 'DEALER_WIN', 'PUSH', 'FINISHED');

-- CreateTable
CREATE TABLE "BlackjackGame" (
    "id" TEXT NOT NULL,
    "gameRoundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "BlackjackGameStatus" NOT NULL DEFAULT 'PLAYER_TURN',
    "betAmount" BIGINT NOT NULL,
    "playerCards" JSONB NOT NULL,
    "dealerCards" JSONB NOT NULL,
    "playerScore" INTEGER NOT NULL,
    "dealerScore" INTEGER NOT NULL,
    "playerSoft" BOOLEAN NOT NULL DEFAULT false,
    "dealerSoft" BOOLEAN NOT NULL DEFAULT false,
    "canDouble" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackjackGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlackjackGame_gameRoundId_key" ON "BlackjackGame"("gameRoundId");

-- CreateIndex
CREATE INDEX "BlackjackGame_userId_createdAt_idx" ON "BlackjackGame"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BlackjackGame_status_createdAt_idx" ON "BlackjackGame"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "BlackjackGame" ADD CONSTRAINT "BlackjackGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
