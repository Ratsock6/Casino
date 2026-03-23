-- CreateTable
CREATE TABLE "Jackpot" (
    "id" TEXT NOT NULL,
    "amount" BIGINT NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastWonAt" TIMESTAMP(3),
    "lastWonBy" TEXT,
    "lastWonAmount" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jackpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JackpotWin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "gameType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JackpotWin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JackpotWin_userId_idx" ON "JackpotWin"("userId");

-- AddForeignKey
ALTER TABLE "JackpotWin" ADD CONSTRAINT "JackpotWin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
