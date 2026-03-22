-- CreateTable
CREATE TABLE "VipSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "duration" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VipSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VipSubscription_userId_idx" ON "VipSubscription"("userId");

-- CreateIndex
CREATE INDEX "VipSubscription_expiresAt_idx" ON "VipSubscription"("expiresAt");

-- AddForeignKey
ALTER TABLE "VipSubscription" ADD CONSTRAINT "VipSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
