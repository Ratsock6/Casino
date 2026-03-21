-- AlterTable
ALTER TABLE "User" ADD COLUMN     "hasAcceptedTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3);
