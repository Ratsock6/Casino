-- CreateEnum
CREATE TYPE "RaffleCampaignStatus" AS ENUM ('DRAFT', 'OPEN', 'ENDED');

-- CreateEnum
CREATE TYPE "RaffleDrawStatus" AS ENUM ('PENDING', 'DONE');

-- CreateEnum
CREATE TYPE "RafflePrizeType" AS ENUM ('CHIPS', 'VIP', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RaffleTicketStatus" AS ENUM ('ACTIVE', 'WON');

-- CreateEnum
CREATE TYPE "RaffleClaimStatus" AS ENUM ('UNCLAIMED', 'CLAIMED', 'EXPIRED');

-- CreateTable
CREATE TABLE "RaffleCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "RaffleCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "ticketPrice" BIGINT NOT NULL,
    "maxTicketsPerUser" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleDraw" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "label" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "RaffleDrawStatus" NOT NULL DEFAULT 'PENDING',
    "executedAt" TIMESTAMP(3),
    "seed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleDraw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RafflePrize" (
    "id" TEXT NOT NULL,
    "drawId" TEXT NOT NULL,
    "type" "RafflePrizeType" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RafflePrize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleTicket" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketNumber" INTEGER NOT NULL,
    "status" "RaffleTicketStatus" NOT NULL DEFAULT 'ACTIVE',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "wonDrawId" TEXT,
    "wonPrizeId" TEXT,
    "claimStatus" "RaffleClaimStatus",
    "claimDeadline" TIMESTAMP(3),
    "claimedAt" TIMESTAMP(3),

    CONSTRAINT "RaffleTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaffleCampaign_status_idx" ON "RaffleCampaign"("status");

-- CreateIndex
CREATE INDEX "RaffleCampaign_startsAt_endsAt_idx" ON "RaffleCampaign"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "RaffleDraw_campaignId_idx" ON "RaffleDraw"("campaignId");

-- CreateIndex
CREATE INDEX "RaffleDraw_status_scheduledAt_idx" ON "RaffleDraw"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "RafflePrize_drawId_idx" ON "RafflePrize"("drawId");

-- CreateIndex
CREATE INDEX "RaffleTicket_campaignId_status_idx" ON "RaffleTicket"("campaignId", "status");

-- CreateIndex
CREATE INDEX "RaffleTicket_userId_campaignId_idx" ON "RaffleTicket"("userId", "campaignId");

-- CreateIndex
CREATE INDEX "RaffleTicket_wonDrawId_idx" ON "RaffleTicket"("wonDrawId");

-- CreateIndex
CREATE INDEX "RaffleTicket_claimStatus_claimDeadline_idx" ON "RaffleTicket"("claimStatus", "claimDeadline");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleTicket_campaignId_ticketNumber_key" ON "RaffleTicket"("campaignId", "ticketNumber");

-- AddForeignKey
ALTER TABLE "RaffleDraw" ADD CONSTRAINT "RaffleDraw_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RaffleCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RafflePrize" ADD CONSTRAINT "RafflePrize_drawId_fkey" FOREIGN KEY ("drawId") REFERENCES "RaffleDraw"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "RaffleCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_wonDrawId_fkey" FOREIGN KEY ("wonDrawId") REFERENCES "RaffleDraw"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_wonPrizeId_fkey" FOREIGN KEY ("wonPrizeId") REFERENCES "RafflePrize"("id") ON DELETE SET NULL ON UPDATE CASCADE;
