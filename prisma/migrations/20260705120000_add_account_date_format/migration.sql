CREATE TYPE "AccountDateFormat" AS ENUM ('DD_MM_YY', 'MM_DD_YY', 'YYYY_MM_DD');

ALTER TABLE "User"
ADD COLUMN "dateFormat" "AccountDateFormat" NOT NULL DEFAULT 'DD_MM_YY';
