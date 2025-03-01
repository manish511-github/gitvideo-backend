/*
  Warnings:

  - A unique constraint covering the columns `[commitId]` on the table `Commit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Video_fileName_key";

-- AlterTable
ALTER TABLE "Commit" ADD COLUMN     "parentCommitId" INTEGER;

-- CreateTable
CREATE TABLE "Change" (
    "id" SERIAL NOT NULL,
    "commitId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "start" DOUBLE PRECISION,
    "end" DOUBLE PRECISION,
    "content" TEXT,
    "position" JSONB,

    CONSTRAINT "Change_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Commit_commitId_key" ON "Commit"("commitId");

-- AddForeignKey
ALTER TABLE "Commit" ADD CONSTRAINT "Commit_parentCommitId_fkey" FOREIGN KEY ("parentCommitId") REFERENCES "Commit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Change" ADD CONSTRAINT "Change_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
