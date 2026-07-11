-- AlterTable
ALTER TABLE "public"."File" ADD COLUMN     "mimeType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "resourceType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "size" INTEGER NOT NULL DEFAULT 0;
