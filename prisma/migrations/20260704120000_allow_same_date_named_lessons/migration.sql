UPDATE "HomeworkRecord"
SET "status" = 'INCOMPLETE'
WHERE "status" = 'NOT_ASSIGNED';

ALTER TABLE "HomeworkRecord" ALTER COLUMN "status" DROP DEFAULT;

CREATE TYPE "HomeworkStatus_new" AS ENUM ('COMPLETED', 'INCOMPLETE');

ALTER TABLE "HomeworkRecord"
ALTER COLUMN "status" TYPE "HomeworkStatus_new"
USING ("status"::text::"HomeworkStatus_new");

ALTER TYPE "HomeworkStatus" RENAME TO "HomeworkStatus_old";
ALTER TYPE "HomeworkStatus_new" RENAME TO "HomeworkStatus";
DROP TYPE "HomeworkStatus_old";

ALTER TABLE "HomeworkRecord" ALTER COLUMN "status" SET DEFAULT 'INCOMPLETE';

DROP INDEX "Lesson_classId_lessonDate_key";
CREATE UNIQUE INDEX "Lesson_classId_lessonDate_name_key" ON "Lesson"("classId", "lessonDate", "name");
