import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const RISK_THRESHOLDS = {
  incompleteHomework: 3,
  missedClasses: 3,
  consecutiveMissedClasses: 2,
} as const;

type RiskPageProps = {
  searchParams: Promise<{
    classId?: string;
    dateFrom?: string;
    dateTo?: string;
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
  hasConsecutiveMissedClasses: boolean;
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

  if (record.hasConsecutiveMissedClasses) {
    labels.push("2 missed classes in a row");
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
) {
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
          hasConsecutiveMissedClasses: false,
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

      for (const item of attendanceTimeline) {
        missedStreak = item.isMissed ? missedStreak + 1 : 0;

        if (missedStreak >= RISK_THRESHOLDS.consecutiveMissedClasses) {
          record.hasConsecutiveMissedClasses = true;
          break;
        }
      }

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
  const dateStart = readFilterDate(dateFrom, "start");
  const dateEnd = readFilterDate(dateTo, "end");

  const [classes, teachers, lessons] = await Promise.all([
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
  ]);

  const riskRecords = summarizeRiskRecords(lessons);

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
                      </div>
                    </td>
                  </tr>
                ))}
                {riskRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No students match the current risk thresholds.</td>
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
            {RISK_THRESHOLDS.consecutiveMissedClasses} absent records in a row.
            Excused absences and late arrivals are not counted as missed classes
            by default.
          </p>
        </section>
      </div>
    </main>
  );
}
