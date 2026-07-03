-- Remove the old API-oriented SYNCED status from lessons.
-- If any local development row still uses it, preserve the lesson as SUBMITTED.
UPDATE "Lesson"
SET "status" = 'SUBMITTED'
WHERE "status" = 'SYNCED';

ALTER TYPE "LessonStatus" RENAME TO "LessonStatus_old";

CREATE TYPE "LessonStatus" AS ENUM ('DRAFT', 'SUBMITTED');

ALTER TABLE "Lesson"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Lesson"
  ALTER COLUMN "status" TYPE "LessonStatus"
  USING ("status"::text::"LessonStatus");

ALTER TABLE "Lesson"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

DROP TYPE "LessonStatus_old";
