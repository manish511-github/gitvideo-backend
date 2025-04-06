-- CreateTable
CREATE TABLE "ChangeTimeline" (
    "id" SERIAL NOT NULL,
    "changeId" TEXT NOT NULL,
    "parentchangeId" TEXT,
    "chTimeline" JSONB NOT NULL,

    CONSTRAINT "ChangeTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChangeTimeline_changeId_key" ON "ChangeTimeline"("changeId");

-- AddForeignKey
ALTER TABLE "ChangeTimeline" ADD CONSTRAINT "ChangeTimeline_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "Change"("changeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeTimeline" ADD CONSTRAINT "ChangeTimeline_parentchangeId_fkey" FOREIGN KEY ("parentchangeId") REFERENCES "Change"("changeId") ON DELETE SET NULL ON UPDATE CASCADE;
