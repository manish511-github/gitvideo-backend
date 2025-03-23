/*
  Warnings:

  - The `sourceVideoId` column on the `Change` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Change" DROP COLUMN "sourceVideoId",
ADD COLUMN     "sourceVideoId" INTEGER;
