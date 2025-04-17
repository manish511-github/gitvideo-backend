-- CreateTable
CREATE TABLE "CommitMetaData" (
    "id" SERIAL NOT NULL,
    "commitId" INTEGER NOT NULL,
    "metaData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommitMetaData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitMetaData_commitId_key" ON "CommitMetaData"("commitId");

-- AddForeignKey
ALTER TABLE "CommitMetaData" ADD CONSTRAINT "CommitMetaData_commitId_fkey" FOREIGN KEY ("commitId") REFERENCES "Commit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
