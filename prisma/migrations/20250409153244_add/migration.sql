/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Repository` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Commit" ADD COLUMN     "thumbnail" TEXT NOT NULL DEFAULT 'https://www.gravatar.com/avatar/2c7d99fe281ecd3bcd65ab915bac6dd5?s=250';

-- CreateIndex
CREATE UNIQUE INDEX "Repository_name_key" ON "Repository"("name");
