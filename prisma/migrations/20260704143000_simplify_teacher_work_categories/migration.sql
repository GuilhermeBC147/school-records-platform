CREATE TYPE "TeacherWorkCategory_new" AS ENUM (
  'BONUS_CLASS',
  'EXTRA_ACTIVITY',
  'MEETING',
  'OTHER'
);

ALTER TABLE "TeacherWorkLog"
  ALTER COLUMN "category" TYPE "TeacherWorkCategory_new"
  USING (
    CASE
      WHEN "category"::text IN ('EVENT', 'GAME_NIGHT', 'HOLIDAY_ACTIVITY')
        THEN 'EXTRA_ACTIVITY'
      ELSE "category"::text
    END
  )::"TeacherWorkCategory_new";

DROP TYPE "TeacherWorkCategory";
ALTER TYPE "TeacherWorkCategory_new" RENAME TO "TeacherWorkCategory";
