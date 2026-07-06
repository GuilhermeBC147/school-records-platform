CREATE TYPE "AccountLocale" AS ENUM ('EN', 'PT_BR');

ALTER TABLE "User"
ADD COLUMN "locale" "AccountLocale" NOT NULL DEFAULT 'PT_BR';
