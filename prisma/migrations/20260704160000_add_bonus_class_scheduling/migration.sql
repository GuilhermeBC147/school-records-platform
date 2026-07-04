ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'RECEPTION';

CREATE TYPE "BonusClassStatus" AS ENUM (
  'SCHEDULED',
  'COMPLETED',
  'CANCELED'
);

CREATE TABLE "BonusClass" (
  "id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "status" "BonusClassStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "BonusClass_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BonusClass"
  ADD CONSTRAINT "BonusClass_durationMinutes_check"
  CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 720);

ALTER TABLE "BonusClass"
  ADD CONSTRAINT "BonusClass_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BonusClass"
  ADD CONSTRAINT "BonusClass_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BonusClass"
  ADD CONSTRAINT "BonusClass_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BonusClass_createdById_idx" ON "BonusClass"("createdById");
CREATE INDEX "BonusClass_studentId_idx" ON "BonusClass"("studentId");
CREATE INDEX "BonusClass_teacherId_scheduledDate_idx" ON "BonusClass"("teacherId", "scheduledDate");
CREATE INDEX "BonusClass_status_idx" ON "BonusClass"("status");
