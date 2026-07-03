import { NextResponse } from "next/server";
import { formatShortDateTime } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function readFilterValue(value: string | null) {
  return value?.trim() || undefined;
}

function readFilterDate(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(Date.UTC(year, month - 1, day + 1));

  return { end, start };
}

function csvCell(value: string | number | null | undefined) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (currentUser.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const searchParams = new URL(request.url).searchParams;
  const classId = readFilterValue(searchParams.get("classId"));
  const dateRange = readFilterDate(searchParams.get("date"));
  const studentId = readFilterValue(searchParams.get("studentId"));
  const teacherId = readFilterValue(searchParams.get("teacherId"));

  const lessons = await prisma.lesson.findMany({
    where: {
      status: "SUBMITTED",
      ...(classId ? { classId } : {}),
      ...(dateRange
        ? {
            lessonDate: {
              gte: dateRange.start,
              lt: dateRange.end,
            },
          }
        : {}),
      ...(teacherId ? { class: { teacherId } } : {}),
      ...(studentId
        ? {
            attendanceRecords: {
              some: { studentId },
            },
          }
        : {}),
    },
    orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      lessonDate: true,
      notes: true,
      submittedAt: true,
      class: {
        select: {
          name: true,
          teacher: {
            select: {
              name: true,
            },
          },
        },
      },
      submittedBy: {
        select: {
          name: true,
        },
      },
      attendanceRecords: {
        orderBy: {
          student: { fullName: "asc" },
        },
        select: {
          status: true,
          student: {
            select: {
              id: true,
              fullName: true,
              preferredName: true,
            },
          },
        },
      },
      homeworkRecords: {
        select: {
          status: true,
          studentId: true,
        },
      },
    },
  });

  const rows = [
    [
      "lesson_id",
      "lesson_name",
      "lesson_date",
      "class",
      "teacher",
      "student",
      "preferred_name",
      "attendance",
      "homework",
      "submitted_by",
      "submitted_at",
      "notes",
    ],
  ];

  for (const lesson of lessons) {
    const homeworkByStudentId = new Map(
      lesson.homeworkRecords.map((record) => [record.studentId, record.status]),
    );

    for (const attendanceRecord of lesson.attendanceRecords) {
      if (studentId && attendanceRecord.student.id !== studentId) {
        continue;
      }

      rows.push([
        lesson.id,
        lesson.name ?? "",
        formatShortDateTime(lesson.lessonDate),
        lesson.class.name,
        lesson.class.teacher.name,
        attendanceRecord.student.fullName,
        attendanceRecord.student.preferredName ?? "",
        attendanceRecord.status,
        homeworkByStudentId.get(attendanceRecord.student.id) ?? "NOT_ASSIGNED",
        lesson.submittedBy?.name ?? "",
        lesson.submittedAt ? formatShortDateTime(lesson.submittedAt) : "",
        lesson.notes ?? "",
      ]);
    }
  }

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": 'attachment; filename="class-records.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
