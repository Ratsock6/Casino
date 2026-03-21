-- CreateTable
CREATE TABLE "CasinoConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "CasinoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CasinoConfig_key_key" ON "CasinoConfig"("key");

-- CreateIndex
CREATE INDEX "CasinoConfig_key_idx" ON "CasinoConfig"("key");
