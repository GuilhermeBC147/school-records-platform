CREATE TYPE "ImportBatchType" AS ENUM ('STUDENT', 'CLASS');

CREATE TYPE "ImportBatchStatus" AS ENUM ('DRAFT', 'CONFIRMED');

CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'FAILED', 'DUPLICATE', 'CREATED', 'SKIPPED');

ALTER TABLE "Student" ADD COLUMN "enrollmentIdentifier" TEXT;

CREATE TABLE "ImportBatch" (
  "id" TEXT NOT NULL,
  "type" "ImportBatchType" NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceFilename" TEXT,
  "createdCount" INTEGER NOT NULL DEFAULT 0,
  "skippedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicatedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdById" TEXT NOT NULL,

  CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportRow" (
  "id" TEXT NOT NULL,
  "rowNumber" INTEGER NOT NULL,
  "rawRow" JSONB NOT NULL,
  "normalizedRow" JSONB NOT NULL,
  "status" "ImportRowStatus" NOT NULL,
  "errors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "warnings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdRecordId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "importBatchId" TEXT NOT NULL,

  CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Student_enrollmentIdentifier_key" ON "Student"("enrollmentIdentifier");
CREATE INDEX "ImportBatch_createdById_idx" ON "ImportBatch"("createdById");
CREATE INDEX "ImportBatch_type_status_idx" ON "ImportBatch"("type", "status");
CREATE INDEX "ImportRow_importBatchId_idx" ON "ImportRow"("importBatchId");
CREATE INDEX "ImportRow_status_idx" ON "ImportRow"("status");

ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
