CREATE TYPE "LetterGrade" AS ENUM (
  'D_MINUS',
  'D',
  'D_PLUS',
  'C_MINUS',
  'C',
  'C_PLUS',
  'B_MINUS',
  'B',
  'B_PLUS',
  'A_MINUS',
  'A'
);

CREATE TYPE "PartialEvaluationPeriod" AS ENUM (
  'CLASS_7',
  'CLASS_23'
);

CREATE TYPE "TestPeriod" AS ENUM (
  'MID_TERM',
  'FINAL'
);

CREATE TABLE "PartialEvaluationGrade" (
  "id" TEXT NOT NULL,
  "period" "PartialEvaluationPeriod" NOT NULL,
  "grade" "LetterGrade" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,

  CONSTRAINT "PartialEvaluationGrade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestGrade" (
  "id" TEXT NOT NULL,
  "period" "TestPeriod" NOT NULL,
  "oralGrade" "LetterGrade" NOT NULL,
  "compositionScore" DECIMAL(4,2) NOT NULL,
  "writtenTestScore" DECIMAL(4,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,

  CONSTRAINT "TestGrade_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TestGrade_compositionScore_range" CHECK ("compositionScore" >= 0 AND "compositionScore" <= 2),
  CONSTRAINT "TestGrade_writtenTestScore_range" CHECK ("writtenTestScore" >= 0 AND "writtenTestScore" <= 8)
);

CREATE UNIQUE INDEX "PartialEvaluationGrade_classId_studentId_period_key"
  ON "PartialEvaluationGrade"("classId", "studentId", "period");

CREATE INDEX "PartialEvaluationGrade_studentId_idx"
  ON "PartialEvaluationGrade"("studentId");

CREATE UNIQUE INDEX "TestGrade_classId_studentId_period_key"
  ON "TestGrade"("classId", "studentId", "period");

CREATE INDEX "TestGrade_studentId_idx"
  ON "TestGrade"("studentId");

ALTER TABLE "PartialEvaluationGrade"
  ADD CONSTRAINT "PartialEvaluationGrade_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PartialEvaluationGrade"
  ADD CONSTRAINT "PartialEvaluationGrade_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TestGrade"
  ADD CONSTRAINT "TestGrade_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TestGrade"
  ADD CONSTRAINT "TestGrade_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
