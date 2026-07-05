CREATE TABLE "TeacherWorkLogStudent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "teacherWorkLogId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,

  CONSTRAINT "TeacherWorkLogStudent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeacherWorkLogStudent_teacherWorkLogId_studentId_key"
  ON "TeacherWorkLogStudent"("teacherWorkLogId", "studentId");

CREATE INDEX "TeacherWorkLogStudent_studentId_idx"
  ON "TeacherWorkLogStudent"("studentId");

ALTER TABLE "TeacherWorkLogStudent"
  ADD CONSTRAINT "TeacherWorkLogStudent_teacherWorkLogId_fkey"
  FOREIGN KEY ("teacherWorkLogId")
  REFERENCES "TeacherWorkLog"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

ALTER TABLE "TeacherWorkLogStudent"
  ADD CONSTRAINT "TeacherWorkLogStudent_studentId_fkey"
  FOREIGN KEY ("studentId")
  REFERENCES "Student"("id")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
