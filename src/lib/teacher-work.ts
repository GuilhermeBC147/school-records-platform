import { prisma } from "@/lib/prisma";
import { mergedIntervalMinutes } from "@/lib/personal-slots";
import type { AccountLocale } from "@/lib/locale";
import { defaultUnauthenticatedLocale } from "@/lib/locale";
import { translate } from "@/lib/translations";

export const teacherWorkCategories = [
  { label: "Bonus Class", value: "BONUS_CLASS" },
  { label: "Extra Activity", value: "EXTRA_ACTIVITY" },
  { label: "Meeting", value: "MEETING" },
  { label: "Other", value: "OTHER" },
] as const;

export type TeacherWorkCategoryValue =
  (typeof teacherWorkCategories)[number]["value"];

export function formatTeacherWorkCategory(
  category: string,
  locale: AccountLocale = defaultUnauthenticatedLocale,
) {
  switch (category) {
    case "BONUS_CLASS":
      return translate(locale, "workCategory.BONUS_CLASS");
    case "EXTRA_ACTIVITY":
      return translate(locale, "workCategory.EXTRA_ACTIVITY");
    case "MEETING":
      return translate(locale, "workCategory.MEETING");
    case "OTHER":
      return translate(locale, "workCategory.OTHER");
    default:
      return category;
  }
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

  const [lessons, bonusClasses, workLogs, personalSlotBookings] = await Promise.all([
    prisma.lesson.findMany({
      where: {
        lessonDate: {
          gte: start,
          lt: end,
        },
        status: "SUBMITTED",
        OR: [
          {
            class: {
              teacherId,
            },
            substitutionStatus: "NONE",
          },
          {
            substitutionStatus: "APPROVED",
            taughtById: teacherId,
          },
        ],
      },
      orderBy: [{ lessonDate: "asc" }, { name: "asc" }],
      select: {
        id: true,
        lessonDate: true,
        name: true,
        substitutionStatus: true,
        class: {
          select: {
            durationMinutes: true,
            classType: true,
            startTime: true,
            name: true,
            teacher: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.bonusClass.findMany({
      where: {
        scheduledDate: {
          gte: start,
          lt: end,
        },
        status: "COMPLETED",
        teacherId,
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        durationMinutes: true,
        scheduledDate: true,
        startTime: true,
        subject: true,
        student: {
          select: {
            fullName: true,
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
        students: {
          orderBy: {
            student: { fullName: "asc" },
          },
          select: {
            student: {
              select: {
                fullName: true,
              },
            },
          },
        },
        subject: true,
        title: true,
        workDate: true,
      },
    }),
    prisma.personalSlotBooking.findMany({where:{teacherId,scheduledDate:{gte:start,lt:end},status:"COMPLETED"},select:{id:true,scheduledDate:true,startTime:true,durationMinutes:true,purpose:true,student:{select:{fullName:true}}},orderBy:[{scheduledDate:"asc"},{startTime:"asc"}]}),
  ]);
  const pendingSubstituteLessons = await prisma.lesson.findMany({
    where: {
      lessonDate: {
        gte: start,
        lt: end,
      },
      status: "SUBMITTED",
      substitutionStatus: "PENDING_APPROVAL",
      taughtById: teacherId,
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
          teacher: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const ordinaryLessonMinutes = lessons.filter((lesson)=>lesson.class.classType!=="PERSONAL"||!lesson.class.startTime).reduce((total,lesson)=>total+lesson.class.durationMinutes,0);
  const personalByDate = new Map<string,Array<{startTime:string;durationMinutes:number}>>();
  for(const lesson of lessons.filter((lesson)=>lesson.class.classType==="PERSONAL"&&lesson.class.startTime)){const key=lesson.lessonDate.toISOString().slice(0,10); personalByDate.set(key,[...(personalByDate.get(key)??[]),{startTime:lesson.class.startTime!,durationMinutes:lesson.class.durationMinutes}]);}
  for(const booking of personalSlotBookings){const key=booking.scheduledDate.toISOString().slice(0,10); personalByDate.set(key,[...(personalByDate.get(key)??[]),{startTime:booking.startTime,durationMinutes:booking.durationMinutes}]);}
  const personalSlotMinutes=[...personalByDate.values()].reduce((total,items)=>total+mergedIntervalMinutes(items),0);
  const lessonMinutes = ordinaryLessonMinutes + personalSlotMinutes;
  const bonusClassMinutes = bonusClasses.reduce(
    (total, bonusClass) => total + bonusClass.durationMinutes,
    0,
  );
  const workLogMinutes = workLogs.reduce(
    (total, workLog) => total + workLog.durationMinutes,
    0,
  );

  return {
    bonusClassMinutes,
    bonusClasses,
    lessonMinutes,
    lessons,
    pendingSubstituteLessons,
    personalSlotBookings,
    personalSlotMinutes,
    teacher,
    totalMinutes: lessonMinutes + bonusClassMinutes + workLogMinutes,
    workLogMinutes,
    workLogs,
  };
}
