-- CreateEnum
CREATE TYPE "BattleBoxStatus" AS ENUM ('WAITING', 'READY', 'PLAYING', 'FINISHED', 'CANCELLED');

-- CreateTable
CREATE TABLE "BattleBoxGame" (
    "id" TEXT NOT NULL,
    "status" "BattleBoxStatus" NOT NULL DEFAULT 'WAITING',
    "maxPlayers" INTEGER NOT NULL DEFAULT 2,
    "teamSize" INTEGER NOT NULL DEFAULT 1,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "inviteCode" TEXT,
    "boxTypes" JSONB NOT NULL,
    "totalStake" BIGINT NOT NULL DEFAULT 0,
    "commissionPct" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "winnerId" TEXT,
    "winnerTeam" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "BattleBoxGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleBoxPlayer" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamIndex" INTEGER NOT NULL DEFAULT 0,
    "stake" BIGINT NOT NULL,
    "items" JSONB,
    "totalValue" BIGINT,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleBoxPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleBoxGame_inviteCode_key" ON "BattleBoxGame"("inviteCode");

-- CreateIndex
CREATE INDEX "BattleBoxGame_status_isPrivate_idx" ON "BattleBoxGame"("status", "isPrivate");

-- CreateIndex
CREATE INDEX "BattleBoxGame_inviteCode_idx" ON "BattleBoxGame"("inviteCode");

-- CreateIndex
CREATE INDEX "BattleBoxPlayer_gameId_idx" ON "BattleBoxPlayer"("gameId");

-- CreateIndex
CREATE INDEX "BattleBoxPlayer_userId_idx" ON "BattleBoxPlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleBoxPlayer_gameId_userId_key" ON "BattleBoxPlayer"("gameId", "userId");

-- AddForeignKey
ALTER TABLE "BattleBoxPlayer" ADD CONSTRAINT "BattleBoxPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "BattleBoxGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleBoxPlayer" ADD CONSTRAINT "BattleBoxPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
