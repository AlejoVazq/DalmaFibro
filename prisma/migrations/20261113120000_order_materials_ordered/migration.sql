-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "materialsOrderedAt" TIMESTAMP(3),
ADD COLUMN     "materialsOrderedByName" TEXT,
ADD COLUMN     "materialsShortage" JSONB;
