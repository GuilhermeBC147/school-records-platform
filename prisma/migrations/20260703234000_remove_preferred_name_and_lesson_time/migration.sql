ALTER TABLE "Student" DROP COLUMN "preferredName";

UPDATE "Lesson"
SET "lessonDate" = date_trunc('day', "lessonDate");
