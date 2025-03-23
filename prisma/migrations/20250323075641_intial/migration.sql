/*
  Warnings:

  - You are about to drop the column `content` on the `Change` table. All the data in the column will be lost.
  - You are about to drop the column `position` on the `Change` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Change` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[changeId]` on the table `Change` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `at` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `changeId` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operation` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Added the required column `videoId` to the `Change` table without a default value. This is not possible if the table is not empty.
  - Made the column `start` on table `Change` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end` on table `Change` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Change" DROP CONSTRAINT "Change_commitId_fkey";

-- AlterTable
ALTER TABLE "Change" DROP COLUMN "content",
DROP COLUMN "position",
DROP COLUMN "type",
ADD COLUMN     "at" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "changeId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "operation" TEXT NOT NULL,
ADD COLUMN     "sourceVideoId" TEXT,
ADD COLUMN     "videoId" INTEGER NOT NULL,
ALTER COLUMN "commitId" DROP NOT NULL,
ALTER COLUMN "start" SET NOT NULL,
ALTER COLUMN "end" SET NOT NULL;

-- CreateTable
CREATE TABLE "Segment" (
    "id" SERIAL NOT NULL,
    "videoId" INTEGER NOT NULL,
    "sourceVideoId" INTEGER NOT NULL,
    "sourceStartTime" DOUBLE PRECISION NOT NULL,
    "sourceEndTime" DOUBLE PRECISION NOT NULL,
    "globalStartTime" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Segment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Change_changeId_key" ON "Change"("changeId");

-- AddForeignKey
ALTER TABLE "Segment" ADD CONSTRAINT "Segment_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
