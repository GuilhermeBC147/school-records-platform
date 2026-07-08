"use server";

import { redirect } from "next/navigation";
import {
  classTypeOptions,
  hasTimeOverlap,
  readDurationMinutes,
  readOptionalStartTime,
  weekdayOptions,
  type ClassTypeValue,
  type WeekdayValue,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function readRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readOptionalString(formData: FormData, key: string) {
  return readRequiredString(formData, key) || null;
}

function readTermNumber(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();

  if (!value) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function readWeekdays(formData: FormData) {
  const validWeekdays = new Set(weekdayOptions.map((option) => option.value));

  return Array.from(
    new Set(
      formData
        .getAll("weekDays")
        .map((value) => String(value).trim())
        .filter((value): value is WeekdayValue =>
          validWeekdays.has(value as WeekdayValue),
        ),
    ),
  );
}

function readClassType(formData: FormData): ClassTypeValue | null {
  const classType = readRequiredString(formData, "classType");

  if (classTypeOptions.some((option) => option.value === classType)) {
    return classType as ClassTypeValue;
  }

  return null;
}

function readSelectedStudentIds(formData: FormData) {
  return Array.from(
    new Set(
      formData
        .getAll("studentIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  );
}

function buildEditClassUrl(classId: string, error: string) {
  return `/admin/classes/${classId}?error=${error}`;
}

async function requireAdmin() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return currentUser;
}

async function hasInvalidStudents(studentIds: string[], activeOnly: boolean) {
  if (studentIds.length === 0) {
    return false;
  }

  const students = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      ...(activeOnly ? { isActive: true } : {}),
    },
    select: { id: true },
  });

  return students.length !== studentIds.length;
}

function requiresSingleStudent(classType: ClassTypeValue) {
  return classType === "VIP" || classType === "PERSONAL";
}

function hasSharedWeekday(left: string[], right: string[]) {
  return left.some((weekday) => right.includes(weekday));
}

function readTimeMinutesForSchedule(startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);

  return hours * 60 + minutes;
}

function hasMoreThanThreeConcurrentPersonalStudents(
  intervals: Array<{
    endMinutes: number;
    startMinutes: number;
    studentIds: string[];
    weekday: string;
  }>,
) {
  for (const weekday of new Set(intervals.map((interval) => interval.weekday))) {
    const weekdayIntervals = intervals.filter(
      (interval) => interval.weekday === weekday,
    );
    const checkpoints = Array.from(
      new Set(
        weekdayIntervals.flatMap((interval) => [
          interval.startMinutes,
          interval.endMinutes,
        ]),
      ),
    ).sort((left, right) => left - right);

    for (let index = 0; index < checkpoints.length - 1; index += 1) {
      const segmentStart = checkpoints[index];
      const segmentEnd = checkpoints[index + 1];

      if (segmentStart === segmentEnd) {
        continue;
      }

      const concurrentStudentIds = new Set<string>();

      for (const interval of weekdayIntervals) {
        if (interval.startMinutes < segmentEnd && segmentStart < interval.endMinutes) {
          for (const studentId of interval.studentIds) {
            concurrentStudentIds.add(studentId);
          }
        }
      }

      if (concurrentStudentIds.size > 3) {
        return true;
      }
    }
  }

  return false;
}

async function hasClassScheduleConflict({
  classId,
  classType,
  durationMinutes,
  selectedStudentIds,
  startTime,
  teacherId,
  weekDays,
}: {
  classId?: string;
  classType: ClassTypeValue;
  durationMinutes: number;
  selectedStudentIds: string[];
  startTime: string | null;
  teacherId: string;
  weekDays: WeekdayValue[];
}) {
  if (!startTime) {
    return false;
  }

  const overlappingClasses = await prisma.class.findMany({
    where: {
      isActive: true,
      startTime: { not: null },
      teacherId,
      weekDays: { hasSome: weekDays },
      ...(classId ? { NOT: { id: classId } } : {}),
    },
    select: {
      classType: true,
      durationMinutes: true,
      startTime: true,
      weekDays: true,
      enrollments: {
        where: { status: "ACTIVE", student: { isActive: true } },
        select: { studentId: true },
      },
    },
  });
  const timeOverlaps = overlappingClasses.filter((schoolClass) => {
    if (!schoolClass.startTime || !hasSharedWeekday(weekDays, schoolClass.weekDays)) {
      return false;
    }

    return hasTimeOverlap({
      durationMinutes,
      existingDurationMinutes: schoolClass.durationMinutes,
      existingStartTime: schoolClass.startTime,
      startTime,
    });
  });

  if (timeOverlaps.length === 0) {
    return false;
  }

  if (classType !== "PERSONAL") {
    return true;
  }

  if (timeOverlaps.some((schoolClass) => schoolClass.classType !== "PERSONAL")) {
    return true;
  }

  const startMinutes = readTimeMinutesForSchedule(startTime);
  const intervals = weekDays.map((weekday) => ({
    endMinutes: startMinutes + durationMinutes,
    startMinutes,
    studentIds: selectedStudentIds,
    weekday,
  }));

  for (const schoolClass of timeOverlaps) {
    const existingStartTime = schoolClass.startTime;

    if (!existingStartTime) {
      continue;
    }

    const existingStartMinutes = readTimeMinutesForSchedule(existingStartTime);
    const studentIds = schoolClass.enrollments.map(
      (enrollment) => enrollment.studentId,
    );

    for (const weekday of schoolClass.weekDays.filter((weekday) =>
      weekDays.includes(weekday),
    )) {
      intervals.push({
        endMinutes: existingStartMinutes + schoolClass.durationMinutes,
        startMinutes: existingStartMinutes,
        studentIds,
        weekday,
      });
    }
  }

  return hasMoreThanThreeConcurrentPersonalStudents(intervals);
}

async function readClassForm(formData: FormData) {
  const name = readRequiredString(formData, "name");
  const classType = readClassType(formData);
  const book = readOptionalString(formData, "book");
  const semester = readTermNumber(formData, "semester");
  const year = readTermNumber(formData, "year");
  const rawStartTime = String(formData.get("startTime") ?? "").trim();
  const startTime = readOptionalStartTime(formData.get("startTime"));
  const durationMinutes = readDurationMinutes(formData.get("durationMinutes"));
  const weekDays = readWeekdays(formData);
  const teacherId = readRequiredString(formData, "teacherId");
  const isActive = formData.get("isActive") === "on";

  if (
    !name ||
    !classType ||
    !teacherId ||
    (rawStartTime && !startTime) ||
    durationMinutes === null ||
    durationMinutes < 1 ||
    durationMinutes > 600 ||
    weekDays.length === 0 ||
    (semester !== null && ![1, 2].includes(semester)) ||
    (year !== null && (year < 2000 || year > 2100))
  ) {
    return null;
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
      isActive: true,
    },
    select: { id: true },
  });

  if (!teacher) {
    return null;
  }

  return {
    book,
    classType,
    durationMinutes,
    isActive,
    name,
    semester,
    startTime,
    teacherId,
    weekDays,
    year,
  };
}

export async function createClassAction(formData: FormData) {
  await requireAdmin();

  const classData = await readClassForm(formData);
  const selectedStudentIds = readSelectedStudentIds(formData);

  if (!classData || (await hasInvalidStudents(selectedStudentIds, true))) {
    redirect("/admin/classes/new?error=invalid");
  }

  if (
    (requiresSingleStudent(classData.classType) && selectedStudentIds.length !== 1) ||
    (await hasClassScheduleConflict({
      ...classData,
      selectedStudentIds,
    }))
  ) {
    redirect("/admin/classes/new?error=schedule");
  }

  await prisma.class.create({
    data: {
      ...classData,
      enrollments: {
        create: selectedStudentIds.map((studentId) => ({
          studentId,
          startDate: new Date(),
          status: "ACTIVE",
        })),
      },
    },
  });

  redirect("/admin/classes?status=created");
}

export async function updateClassAction(formData: FormData) {
  await requireAdmin();

  const classId = readRequiredString(formData, "classId");
  const classData = await readClassForm(formData);

  if (!classId || !classData) {
    redirect(buildEditClassUrl(classId, "invalid"));
  }

  const schoolClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      enrollments: {
        where: { status: "ACTIVE", student: { isActive: true } },
        select: { studentId: true },
      },
    },
  });

  if (!schoolClass) {
    redirect("/admin/classes");
  }

  const activeStudentIds = schoolClass.enrollments.map(
    (enrollment) => enrollment.studentId,
  );

  if (requiresSingleStudent(classData.classType) && activeStudentIds.length !== 1) {
    redirect(buildEditClassUrl(classId, "class-roster-size"));
  }

  if (
    await hasClassScheduleConflict({
      ...classData,
      classId,
      selectedStudentIds: activeStudentIds,
    })
  ) {
    redirect(buildEditClassUrl(classId, "schedule"));
  }

  await prisma.class.update({
    where: { id: classId },
    data: classData,
  });

  redirect("/admin/classes?status=updated");
}

export async function updateClassRosterAction(formData: FormData) {
  await requireAdmin();

  const classId = readRequiredString(formData, "classId");
  const selectedStudentIds = readSelectedStudentIds(formData);

  if (!classId) {
    redirect("/admin/classes");
  }

  const schoolClass = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      classType: true,
      durationMinutes: true,
      id: true,
      startTime: true,
      teacherId: true,
      weekDays: true,
    },
  });

  if (
    !schoolClass ||
    (await hasInvalidStudents(selectedStudentIds, true))
  ) {
    redirect(buildEditClassUrl(classId, "roster"));
  }

  if (
    requiresSingleStudent(schoolClass.classType) &&
    selectedStudentIds.length !== 1
  ) {
    redirect(buildEditClassUrl(classId, "roster-size"));
  }

  if (
    schoolClass.classType === "PERSONAL" &&
    await hasClassScheduleConflict({
      classId,
      classType: schoolClass.classType,
      durationMinutes: schoolClass.durationMinutes,
      selectedStudentIds,
      startTime: schoolClass.startTime,
      teacherId: schoolClass.teacherId,
      weekDays: schoolClass.weekDays,
    })
  ) {
    redirect(buildEditClassUrl(classId, "roster-schedule"));
  }

  await prisma.$transaction([
    prisma.enrollment.updateMany({
      where: {
        classId,
        studentId: { notIn: selectedStudentIds },
        status: "ACTIVE",
      },
      data: {
        endDate: new Date(),
        status: "INACTIVE",
      },
    }),
    ...selectedStudentIds.map((studentId) =>
      prisma.enrollment.upsert({
        where: {
          classId_studentId: {
            classId,
            studentId,
          },
        },
        create: {
          classId,
          studentId,
          startDate: new Date(),
          status: "ACTIVE",
        },
        update: {
          endDate: null,
          status: "ACTIVE",
        },
      }),
    ),
  ]);

  redirect(`/admin/classes/${classId}?status=roster-updated`);
}
