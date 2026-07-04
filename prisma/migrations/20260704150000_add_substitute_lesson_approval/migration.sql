CREATE TYPE "SubstitutionStatus" AS ENUM (
  'NONE',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED'
);

ALTER TABLE "Lesson"
  ADD COLUMN "substitutionStatus" "SubstitutionStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "substitutionNotes" TEXT,
  ADD COLUMN "substitutionReviewedAt" TIMESTAMP(3),
  ADD COLUMN "substitutionReviewedById" TEXT,
  ADD COLUMN "taughtById" TEXT;

UPDATE "Lesson"
SET "taughtById" = "Class"."teacherId"
FROM "Class"
WHERE "Lesson"."classId" = "Class"."id";

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_taughtById_fkey"
  FOREIGN KEY ("taughtById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lesson"
  ADD CONSTRAINT "Lesson_substitutionReviewedById_fkey"
  FOREIGN KEY ("substitutionReviewedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lesson_taughtById_idx" ON "Lesson"("taughtById");
CREATE INDEX "Lesson_substitutionStatus_idx" ON "Lesson"("substitutionStatus");
CREATE INDEX "Lesson_substitutionReviewedById_idx" ON "Lesson"("substitutionReviewedById");
