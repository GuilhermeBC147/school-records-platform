CREATE TYPE "TeacherWorkCategory" AS ENUM (
  'BONUS_CLASS',
  'EVENT',
  'GAME_NIGHT',
  'HOLIDAY_ACTIVITY',
  'MEETING',
  'OTHER'
);

CREATE TABLE "TeacherWorkLog" (
  "id" TEXT NOT NULL,
  "category" "TeacherWorkCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "workDate" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT,
  "durationMinutes" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "teacherId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,

  CONSTRAINT "TeacherWorkLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TeacherWorkLog"
  ADD CONSTRAINT "TeacherWorkLog_durationMinutes_check"
  CHECK ("durationMinutes" > 0 AND "durationMinutes" <= 720);

ALTER TABLE "TeacherWorkLog"
  ADD CONSTRAINT "TeacherWorkLog_teacherId_fkey"
  FOREIGN KEY ("teacherId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TeacherWorkLog"
  ADD CONSTRAINT "TeacherWorkLog_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TeacherWorkLog_teacherId_workDate_idx"
  ON "TeacherWorkLog"("teacherId", "workDate");

CREATE INDEX "TeacherWorkLog_createdById_idx"
  ON "TeacherWorkLog"("createdById");
