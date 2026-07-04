import { prisma } from "@/lib/prisma";

export const teacherWorkCategories = [
  { label: "Bonus class", value: "BONUS_CLASS" },
  { label: "Event", value: "EVENT" },
  { label: "Game night", value: "GAME_NIGHT" },
  { label: "Holiday activity", value: "HOLIDAY_ACTIVITY" },
  { label: "Meeting", value: "MEETING" },
  { label: "Other", value: "OTHER" },
] as const;

export type TeacherWorkCategoryValue =
  (typeof teacherWorkCategories)[number]["value"];

export function formatTeacherWorkCategory(category: string) {
  return (
    teacherWorkCategories.find((option) => option.value === category)?.label ??
    category
  );
}

export function readMonth(value: string | undefined) {
  const now = new Date();
  const fallback = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1,
  ).padStart(2, "0")}`;
  const candidate = value && /^\d{4}-\d{2}$/.test(value) ? value : fallback;
  const [year, month] = candidate.split("-").map(Number);
  const monthValue = month >= 1 && month <= 12 ? candidate : fallback;
  const [safeYear, safeMonth] = monthValue.split("-").map(Number);

  return {
    end: new Date(Date.UTC(safeYear, safeMonth, 1)),
    label: monthValue,
    start: new Date(Date.UTC(safeYear, safeMonth - 1, 1)),
  };
}

export function formatHours(minutes: number) {
  return (minutes / 60).toFixed(2).replace(/\.00$/, "");
}

export async function getTeacherWorkSummary({
  end,
  start,
  teacherId,
}: {
  end: Date;
  start: Date;
  teacherId: string;
}) {
  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      role: "TEACHER",
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!teacher) {
    return null;
  }

  const [lessons, workLogs] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        lessonDate: {
          gte: start,
          lt: end,
        },
        status: "SUBMITTED",
        class: {
          teacherId,
        },
      },
      orderBy: [{ lessonDate: "asc" }, { name: "asc" }],
      select: {
        id: true,
        lessonDate: true,
        name: true,
        class: {
          select: {
            durationMinutes: true,
            name: true,
          },
        },
      },
    }),
    prisma.teacherWorkLog.findMany({
      where: {
        teacherId,
        workDate: {
          gte: start,
          lt: end,
        },
      },
      orderBy: [{ workDate: "asc" }, { startTime: "asc" }, { title: "asc" }],
      select: {
        id: true,
        category: true,
        createdBy: {
          select: {
            name: true,
          },
        },
        durationMinutes: true,
        notes: true,
        startTime: true,
        title: true,
        workDate: true,
      },
    }),
  ]);

  const lessonMinutes = lessons.reduce(
    (total, lesson) => total + lesson.class.durationMinutes,
    0,
  );
  const workLogMinutes = workLogs.reduce(
    (total, workLog) => total + workLog.durationMinutes,
    0,
  );

  return {
    lessonMinutes,
    lessons,
    teacher,
    totalMinutes: lessonMinutes + workLogMinutes,
    workLogMinutes,
    workLogs,
  };
}
