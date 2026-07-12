CREATE TYPE "PersonalSlotBookingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELED');

CREATE TABLE "PersonalSlotBooking" (
  "id" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "scheduledDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "status" "PersonalSlotBookingStatus" NOT NULL DEFAULT 'SCHEDULED',
  "notes" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  CONSTRAINT "PersonalSlotBooking_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PersonalSlotBooking_teacherId_scheduledDate_idx" ON "PersonalSlotBooking"("teacherId", "scheduledDate");
CREATE INDEX "PersonalSlotBooking_studentId_idx" ON "PersonalSlotBooking"("studentId");
CREATE INDEX "PersonalSlotBooking_createdById_idx" ON "PersonalSlotBooking"("createdById");
CREATE INDEX "PersonalSlotBooking_status_idx" ON "PersonalSlotBooking"("status");
ALTER TABLE "PersonalSlotBooking" ADD CONSTRAINT "PersonalSlotBooking_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonalSlotBooking" ADD CONSTRAINT "PersonalSlotBooking_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PersonalSlotBooking" ADD CONSTRAINT "PersonalSlotBooking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
