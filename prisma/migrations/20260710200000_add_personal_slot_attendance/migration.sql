ALTER TABLE "PersonalSlotBooking"
  ADD COLUMN "attendanceStatus" "BonusClassAttendanceStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "attendanceConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "attendanceConfirmedById" TEXT;

CREATE INDEX "PersonalSlotBooking_attendanceConfirmedById_idx" ON "PersonalSlotBooking"("attendanceConfirmedById");
CREATE INDEX "PersonalSlotBooking_attendanceStatus_idx" ON "PersonalSlotBooking"("attendanceStatus");

ALTER TABLE "PersonalSlotBooking"
  ADD CONSTRAINT "PersonalSlotBooking_attendanceConfirmedById_fkey"
  FOREIGN KEY ("attendanceConfirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
