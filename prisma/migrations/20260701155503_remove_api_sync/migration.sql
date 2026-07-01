/*
  Warnings:

  - You are about to drop the column `sponteClassId` on the `Class` table. All the data in the column will be lost.
  - You are about to drop the column `sponteLessonId` on the `Lesson` table. All the data in the column will be lost.
  - You are about to drop the column `sponteStudentId` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `sponteTeacherId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `SyncJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SyncJob" DROP CONSTRAINT "SyncJob_lessonId_fkey";

-- AlterTable
ALTER TABLE "Class" DROP COLUMN "sponteClassId";

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "sponteLessonId";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "sponteStudentId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "sponteTeacherId";

-- DropTable
DROP TABLE "SyncJob";

-- DropEnum
DROP TYPE "SyncAction";

-- DropEnum
DROP TYPE "SyncStatus";
