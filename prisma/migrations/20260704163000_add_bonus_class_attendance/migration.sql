CREATE TYPE "BonusClassAttendanceStatus" AS ENUM (
  'PENDING',
  'PRESENT',
  'ABSENT',
  'EXCUSED'
);

ALTER TABLE "BonusClass"
  ADD COLUMN "attendanceStatus" "BonusClassAttendanceStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "attendanceConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "attendanceConfirmedById" TEXT;

ALTER TABLE "BonusClass"
  ADD CONSTRAINT "BonusClass_attendanceConfirmedById_fkey"
  FOREIGN KEY ("attendanceConfirmedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "BonusClass_attendanceConfirmedById_idx" ON "BonusClass"("attendanceConfirmedById");
CREATE INDEX "BonusClass_attendanceStatus_idx" ON "BonusClass"("attendanceStatus");
