"use server";

import { redirect } from "next/navigation";
import {
  letterGradeOptions,
  partialEvaluationPeriods,
  testPeriods,
  type LetterGradeValue,
  type PartialEvaluationPeriodValue,
  type TestPeriodValue,
} from "@/lib/grades";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const letterGradeValues = letterGradeOptions.map((option) => option.value);

function readRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalGrade(formData: FormData, key: string) {
  const value = readRequiredString(formData, key);

  if (!value) {
    return null;
  }

  return letterGradeValues.includes(value as LetterGradeValue)
    ? (value as LetterGradeValue)
    : undefined;
}

function readScore(formData: FormData, key: string, maxScore: number) {
  const value = readRequiredString(formData, key);

  if (!value) {
    return null;
  }

  const score = Number(value);

  if (
    !Number.isFinite(score) ||
    score < 0 ||
    score > maxScore ||
    !/^\d+(\.\d{1,2})?$/.test(value)
  ) {
    return undefined;
  }

  return score;
}

function gradeField(studentId: string, period: PartialEvaluationPeriodValue) {
  return `partial:${studentId}:${period}`;
}

function oralField(studentId: string, period: TestPeriodValue) {
  return `oral:${studentId}:${period}`;
}

function compositionField(studentId: string, period: TestPeriodValue) {
  return `composition:${studentId}:${period}`;
}

function writtenField(studentId: string, period: TestPeriodValue) {
  return `written:${studentId}:${period}`;
}

export async function updateClassGradesAction(formData: FormData) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN" && currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const classId = readRequiredString(formData, "classId");

  const schoolClass = await prisma.class.findFirst({
    where: {
      id: classId,
      isActive: true,
      ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
    },
    select: {
      id: true,
      enrollments: {
        where: {
          status: "ACTIVE",
          student: { isActive: true },
        },
        select: { studentId: true },
      },
    },
  });

  if (!schoolClass) {
    redirect("/dashboard");
  }

  const studentIds = new Set(
    schoolClass.enrollments.map((enrollment) => enrollment.studentId),
  );

  const writes = [];

  for (const studentId of studentIds) {
    for (const period of partialEvaluationPeriods) {
      const grade = readOptionalGrade(
        formData,
        gradeField(studentId, period.value),
      );

      if (grade === undefined) {
        redirect(`/dashboard/classes/${classId}?grades=invalid`);
      }

      if (!grade) {
        continue;
      }

      writes.push(
        prisma.partialEvaluationGrade.upsert({
          where: {
            classId_studentId_period: {
              classId,
              studentId,
              period: period.value,
            },
          },
          create: {
            classId,
            studentId,
            period: period.value,
            grade,
          },
          update: { grade },
        }),
      );
    }

    for (const period of testPeriods) {
      const oralGrade = readOptionalGrade(
        formData,
        oralField(studentId, period.value),
      );
      const compositionScore = readScore(
        formData,
        compositionField(studentId, period.value),
        2,
      );
      const writtenTestScore = readScore(
        formData,
        writtenField(studentId, period.value),
        8,
      );

      if (
        oralGrade === undefined ||
        compositionScore === undefined ||
        writtenTestScore === undefined
      ) {
        redirect(`/dashboard/classes/${classId}?grades=invalid`);
      }

      const hasAnyTestValue =
        Boolean(oralGrade) ||
        compositionScore !== null ||
        writtenTestScore !== null;
      if (!hasAnyTestValue) {
        continue;
      }

      if (
        !oralGrade ||
        compositionScore === null ||
        writtenTestScore === null
      ) {
        redirect(`/dashboard/classes/${classId}?grades=incomplete`);
      }

      writes.push(
        prisma.testGrade.upsert({
          where: {
            classId_studentId_period: {
              classId,
              studentId,
              period: period.value,
            },
          },
          create: {
            classId,
            studentId,
            period: period.value,
            oralGrade,
            compositionScore,
            writtenTestScore,
          },
          update: {
            oralGrade,
            compositionScore,
            writtenTestScore,
          },
        }),
      );
    }
  }

  if (writes.length > 0) {
    await prisma.$transaction(writes);
  }

  redirect(`/dashboard/classes/${classId}?grades=saved`);
}
