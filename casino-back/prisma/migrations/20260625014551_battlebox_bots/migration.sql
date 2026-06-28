-- DropIndex
DROP INDEX "BattleBoxPlayer_gameId_userId_key";

-- AlterTable
ALTER TABLE "BattleBoxGame" ADD COLUMN     "botProfit" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "hasBots" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "BattleBoxPlayer" ADD COLUMN     "botName" TEXT,
ADD COLUMN     "isBot" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "userId" DROP NOT NULL;
