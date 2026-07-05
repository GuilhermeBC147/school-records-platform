import Link from "next/link";
import {
  resolveRiskRecordAction,
  undoRiskResolutionAction,
} from "@/app/actions/risk";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

const RISK_THRESHOLDS = {
  incompleteHomework: 4,
  missedClasses: 4,
  consecutiveMissedClasses: 2,
} as const;

type RiskPageProps = {
  searchParams: Promise<{
    classId?: string;
    dateFrom?: string;
    dateTo?: string;
    resolutionStatus?: string;
    teacherId?: string;
  }>;
};

type RiskRecord = {
  classId: string;
  className: string;
  incompleteHomeworkCount: number;
  latestSignalDate: Date;
  missedClassCount: number;
  recentLessonId: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  consecutiveMissedClassCount: number;
  resolvedThroughDate?: Date;
};

type RiskResolution = {
  classId: string;
  resolvedThroughDate: Date;
  studentId: string;
};

function readFilterValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function readFilterDate(value: string | undefined, boundary: "start" | "end") {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (boundary === "end") {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  return date;
}

function buildRecordsHref(filters: {
  classId?: string;
  dateFrom?: string;
  dateTo?: string;
  studentId: string;
  teacherId?: string;
}) {
  const params = new URLSearchParams({ studentId: filters.studentId });

  if (filters.classId) {
    params.set("classId", filters.classId);
  }

  if (filters.teacherId) {
    params.set("teacherId", filters.teacherId);
  }

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  return `/admin/records?${params.toString()}`;
}

function getRiskLabels(record: RiskRecord) {
  const labels: string[] = [];

  if (record.incompleteHomeworkCount >= RISK_THRESHOLDS.incompleteHomework) {
    labels.push(`${record.incompleteHomeworkCount} incomplete homework`);
  }

  if (record.missedClassCount >= RISK_THRESHOLDS.missedClasses) {
    labels.push(`${record.missedClassCount} missed classes`);
  }

  if (
    record.consecutiveMissedClassCount >=
    RISK_THRESHOLDS.consecutiveMissedClasses
  ) {
    labels.push(`${record.consecutiveMissedClassCount} missed classes in a row`);
  }

  return labels;
}

function summarizeRiskRecords(
  lessons: {
    id: string;
    lessonDate: Date;
    class: {
      id: string;
      name: string;
      teacher: {
        name: string;
      };
    };
    attendanceRecords: {
      status: string;
      student: {
        id: string;
        fullName: string;
      };
    }[];
    homeworkRecords: {
      status: string;
      studentId: string;
    }[];
  }[],
  resolutions: RiskResolution[],
) {
  const resolutionByStudentClass = new Map(
    resolutions.map((resolution) => [
      `${resolution.classId}:${resolution.studentId}`,
      resolution.resolvedThroughDate,
    ]),
  );
  const recordsByStudentClass = new Map<
    string,
    RiskRecord & { attendanceTimeline: { date: Date; isMissed: boolean }[] }
  >();

  for (const lesson of lessons) {
    const homeworkByStudentId = new Map(
      lesson.homeworkRecords.map((record) => [record.studentId, record.status]),
    );

    for (const attendanceRecord of lesson.attendanceRecords) {
      const key = `${lesson.class.id}:${attendanceRecord.student.id}`;
      const resolvedThroughDate = resolutionByStudentClass.get(key);

      if (resolvedThroughDate && lesson.lessonDate <= resolvedThroughDate) {
        continue;
      }

      const existing = recordsByStudentClass.get(key);
      const homeworkStatus = homeworkByStudentId.get(attendanceRecord.student.id);
      const isMissed = attendanceRecord.status === "ABSENT";
      const isIncompleteHomework = homeworkStatus === "INCOMPLETE";
      const latestSignalDate =
        existing && existing.latestSignalDate > lesson.lessonDate
          ? existing.latestSignalDate
          : lesson.lessonDate;

      const record =
        existing ??
        {
          attendanceTimeline: [],
          classId: lesson.class.id,
          className: lesson.class.name,
          consecutiveMissedClassCount: 0,
          incompleteHomeworkCount: 0,
          latestSignalDate: lesson.lessonDate,
          missedClassCount: 0,
          recentLessonId: lesson.id,
          studentId: attendanceRecord.student.id,
          studentName: attendanceRecord.student.fullName,
          teacherName: lesson.class.teacher.name,
        };

      record.incompleteHomeworkCount += isIncompleteHomework ? 1 : 0;
      record.missedClassCount += isMissed ? 1 : 0;
      record.latestSignalDate = latestSignalDate;

      if (!existing || latestSignalDate.getTime() === lesson.lessonDate.getTime()) {
        record.recentLessonId = lesson.id;
      }

      record.attendanceTimeline.push({
        date: lesson.lessonDate,
        isMissed,
      });

      recordsByStudentClass.set(key, record);
    }
  }

  return Array.from(recordsByStudentClass.values())
    .map((record) => {
      const attendanceTimeline = record.attendanceTimeline.sort(
        (first, second) => first.date.getTime() - second.date.getTime(),
      );
      let missedStreak = 0;
      let longestMissedStreak = 0;

      for (const item of attendanceTimeline) {
        missedStreak = item.isMissed ? missedStreak + 1 : 0;
        longestMissedStreak = Math.max(longestMissedStreak, missedStreak);
      }

      record.consecutiveMissedClassCount = longestMissedStreak;

      return record;
    })
    .filter((record) => getRiskLabels(record).length > 0)
    .sort((first, second) => {
      const firstSignalCount = getRiskLabels(first).length;
      const secondSignalCount = getRiskLabels(second).length;

      if (firstSignalCount !== secondSignalCount) {
        return secondSignalCount - firstSignalCount;
      }

      return second.latestSignalDate.getTime() - first.latestSignalDate.getTime();
    });
}

function buildResolutionWhere(filters: {
  classId?: string;
  teacherId?: string;
}) {
  const conditions = [];

  if (filters.classId) {
    conditions.push(Prisma.sql`resolution."classId" = ${filters.classId}`);
  }

  if (filters.teacherId) {
    conditions.push(Prisma.sql`schoolClass."teacherId" = ${filters.teacherId}`);
  }

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export default async function AdminRiskPage({ searchParams }: RiskPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const filters = await searchParams;
  const classId = readFilterValue(filters.classId);
  const teacherId = readFilterValue(filters.teacherId);
  const dateFrom = readFilterValue(filters.dateFrom);
  const dateTo = readFilterValue(filters.dateTo);
  const resolutionStatus =
    readFilterValue(filters.resolutionStatus) === "resolved"
      ? "resolved"
      : readFilterValue(filters.resolutionStatus) === "all"
        ? "all"
        : "unresolved";
  const dateStart = readFilterDate(dateFrom, "start");
  const dateEnd = readFilterDate(dateTo, "end");

  const [classes, teachers, lessons, resolutions] = await Promise.all([
    prisma.class.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: { role: "TEACHER" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.lesson.findMany({
      where: {
        status: "SUBMITTED",
        ...(classId ? { classId } : {}),
        ...(teacherId ? { class: { teacherId } } : {}),
        ...(dateStart || dateEnd
          ? {
              lessonDate: {
                ...(dateStart ? { gte: dateStart } : {}),
                ...(dateEnd ? { lt: dateEnd } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        lessonDate: true,
        class: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: {
                name: true,
              },
            },
          },
        },
        attendanceRecords: {
          where: {
            student: {
              isActive: true,
            },
          },
          select: {
            status: true,
            student: {
              select: {
                id: true,
                fullName: true,
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
    }),
    prisma.$queryRaw<RiskResolution[]>`
      SELECT
        resolution."classId",
        resolution."resolvedThroughDate",
        resolution."studentId"
      FROM "StudentRiskResolution" resolution
      INNER JOIN "Class" schoolClass ON schoolClass."id" = resolution."classId"
      ${buildResolutionWhere({ classId, teacherId })}
    `,
  ]);

  const unresolvedRiskRecords = summarizeRiskRecords(lessons, resolutions);
  const resolutionByStudentClass = new Map(
    resolutions.map((resolution) => [
      `${resolution.classId}:${resolution.studentId}`,
      resolution.resolvedThroughDate,
    ]),
  );
  const resolvedRiskRecords: RiskRecord[] = [];

  for (const record of summarizeRiskRecords(lessons, [])) {
    const resolvedThroughDate = resolutionByStudentClass.get(
      `${record.classId}:${record.studentId}`,
    );

    if (resolvedThroughDate && record.latestSignalDate <= resolvedThroughDate) {
      resolvedRiskRecords.push({
        ...record,
        resolvedThroughDate,
      });
    }
  }
  const unresolvedKeys = new Set(
    unresolvedRiskRecords.map((record) => `${record.classId}:${record.studentId}`),
  );
  const riskRecords =
    resolutionStatus === "resolved"
      ? resolvedRiskRecords
      : resolutionStatus === "all"
        ? [
            ...unresolvedRiskRecords,
            ...resolvedRiskRecords.filter(
              (record) => !unresolvedKeys.has(`${record.classId}:${record.studentId}`),
            ),
          ]
        : unresolvedRiskRecords;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Class Records Platform</strong>
            <span>{currentUser.name}</span>
          </div>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="risk-title">
          <Link className="text-link" href="/dashboard">
            Back to dashboard
          </Link>
          <p className="eyebrow">Admin review</p>
          <h1 id="risk-title">Student risk review</h1>
          <p className="lede">
            Review students with repeated incomplete homework or missed classes
            across submitted class records.
          </p>
          <div className="metric-grid compact-metrics risk-metrics">
            <article className="metric">
              <span>{riskRecords.length}</span>
              <strong>Flagged rows</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.incompleteHomework}</span>
              <strong>Homework threshold</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.missedClasses}</span>
              <strong>Missed threshold</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.consecutiveMissedClasses}</span>
              <strong>Consecutive missed</strong>
            </article>
          </div>
        </section>

        <section className="panel" aria-label="Risk filters">
          <form className="filter-form">
            <label>
              <span>Teacher</span>
              <select defaultValue={teacherId ?? ""} name="teacherId">
                <option value="">All teachers</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Class</span>
              <select defaultValue={classId ?? ""} name="classId">
                <option value="">All classes</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>From</span>
              <input defaultValue={dateFrom ?? ""} name="dateFrom" type="date" />
            </label>
            <label>
              <span>To</span>
              <input defaultValue={dateTo ?? ""} name="dateTo" type="date" />
            </label>
            <label>
              <span>Situation</span>
              <select defaultValue={resolutionStatus} name="resolutionStatus">
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
                <option value="all">All</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Apply filters
              </button>
              <Link className="text-link" href="/admin/risk">
                Clear
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-label="Risk report">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Teacher</th>
                  <th>Signals</th>
                  <th>Latest signal</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {riskRecords.map((record) => (
                  <tr key={`${record.classId}:${record.studentId}`}>
                    <td>{record.studentName}</td>
                    <td>{record.className}</td>
                    <td>{record.teacherName}</td>
                    <td>
                      <div className="risk-signal-list">
                        {getRiskLabels(record).map((label) => (
                          <span className="risk-signal" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>{formatShortDate(record.latestSignalDate)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="text-link compact-link"
                          href={`/admin/students/${record.studentId}`}
                        >
                          Student
                        </Link>
                        <Link
                          className="text-link compact-link"
                          href={buildRecordsHref({
                            classId: record.classId,
                            dateFrom,
                            dateTo,
                            studentId: record.studentId,
                            teacherId,
                          })}
                        >
                          Records
                        </Link>
                        <Link
                          className="text-link compact-link"
                          href={`/admin/records/${record.recentLessonId}`}
                        >
                          Latest
                        </Link>
                        {"resolvedThroughDate" in record &&
                        record.resolvedThroughDate ? (
                          <form action={undoRiskResolutionAction}>
                            <input name="classId" type="hidden" value={record.classId} />
                            <input
                              name="studentId"
                              type="hidden"
                              value={record.studentId}
                            />
                            <input
                              name="teacherId"
                              type="hidden"
                              value={teacherId ?? ""}
                            />
                            <input
                              name="filterClassId"
                              type="hidden"
                              value={classId ?? ""}
                            />
                            <input
                              name="dateFrom"
                              type="hidden"
                              value={dateFrom ?? ""}
                            />
                            <input name="dateTo" type="hidden" value={dateTo ?? ""} />
                            <input
                              name="resolutionStatus"
                              type="hidden"
                              value={resolutionStatus}
                            />
                            <button className="text-link compact-link" type="submit">
                              Undo resolve
                            </button>
                          </form>
                        ) : (
                          <form action={resolveRiskRecordAction}>
                            <input name="classId" type="hidden" value={record.classId} />
                            <input
                              name="studentId"
                              type="hidden"
                              value={record.studentId}
                            />
                            <input
                              name="resolvedThroughDate"
                              type="hidden"
                              value={record.latestSignalDate.toISOString()}
                            />
                            <input
                              name="teacherId"
                              type="hidden"
                              value={teacherId ?? ""}
                            />
                            <input
                              name="filterClassId"
                              type="hidden"
                              value={classId ?? ""}
                            />
                            <input
                              name="dateFrom"
                              type="hidden"
                              value={dateFrom ?? ""}
                            />
                            <input name="dateTo" type="hidden" value={dateTo ?? ""} />
                            <input
                              name="resolutionStatus"
                              type="hidden"
                              value={resolutionStatus}
                            />
                            <button className="text-link compact-link" type="submit">
                              Resolve
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {riskRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No students match the current risk filters.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel data-panel" aria-labelledby="risk-rules-title">
          <h2 id="risk-rules-title">Default risk rules</h2>
          <p className="muted-copy">
            The report flags active students with at least{" "}
            {RISK_THRESHOLDS.incompleteHomework} incomplete homework records, at
            least {RISK_THRESHOLDS.missedClasses} absent records, or{" "}
            {RISK_THRESHOLDS.consecutiveMissedClasses} or more absent records in
            a row. Resolving a row clears signals through the latest signal date;
            future submitted records can flag the student again. Excused
            absences and late arrivals are not counted as missed classes by
            default.
          </p>
        </section>
      </div>
    </main>
  );
}
