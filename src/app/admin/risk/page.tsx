import Link from "next/link";
import {
  resolveRiskRecordAction,
  undoRiskResolutionAction,
} from "@/app/actions/risk";
import { redirect } from "next/navigation";
import { DateInput } from "@/app/components/date-input";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

const RISK_THRESHOLDS = {
  incompleteHomework: 4,
  lowOralGradeMaximum: "C",
  lowTestTotalScore: 7,
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
  lowOralGradeCount: number;
  lowTestTotalCount: number;
  missedClassCount: number;
  recentLessonId?: string;
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

const lowOralGrades = new Set(["D_MINUS", "D", "D_PLUS", "C_MINUS", "C"]);

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

  return `/admin/records?${params.toString()}`;
}

function getRiskLabels(record: RiskRecord, t?: ReturnType<typeof getTranslations>) {
  const labels: string[] = [];
  const formatRiskSignal = (key: Parameters<ReturnType<typeof getTranslations>>[0], count: number) =>
    t ? t(key).replace("{count}", String(count)) : undefined;

  if (record.incompleteHomeworkCount >= RISK_THRESHOLDS.incompleteHomework) {
    labels.push(
      formatRiskSignal(
        "riskSignal.incompleteHomework",
        record.incompleteHomeworkCount,
      ) ?? `riskSignal.incompleteHomework:${record.incompleteHomeworkCount}`,
    );
  }

  if (record.lowTestTotalCount > 0) {
    labels.push(
      formatRiskSignal("riskSignal.lowTestTotal", record.lowTestTotalCount) ??
        `riskSignal.lowTestTotal:${record.lowTestTotalCount}`,
    );
  }

  if (record.lowOralGradeCount > 0) {
    labels.push(
      formatRiskSignal("riskSignal.lowOralGrade", record.lowOralGradeCount) ??
        `riskSignal.lowOralGrade:${record.lowOralGradeCount}`,
    );
  }

  if (record.missedClassCount >= RISK_THRESHOLDS.missedClasses) {
    labels.push(
      formatRiskSignal("riskSignal.missedClasses", record.missedClassCount) ??
        `riskSignal.missedClasses:${record.missedClassCount}`,
    );
  }

  if (
    record.consecutiveMissedClassCount >=
    RISK_THRESHOLDS.consecutiveMissedClasses
  ) {
    labels.push(
      formatRiskSignal(
        "riskSignal.consecutiveMissedClasses",
        record.consecutiveMissedClassCount,
      ) ??
        `riskSignal.consecutiveMissedClasses:${record.consecutiveMissedClassCount}`,
    );
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
          lowOralGradeCount: 0,
          lowTestTotalCount: 0,
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

function mergeRiskRecords(records: RiskRecord[]) {
  const recordsByStudentClass = new Map<string, RiskRecord>();

  for (const record of records) {
    const key = `${record.classId}:${record.studentId}`;
    const existing = recordsByStudentClass.get(key);

    if (!existing) {
      recordsByStudentClass.set(key, { ...record });
      continue;
    }

    existing.incompleteHomeworkCount += record.incompleteHomeworkCount;
    existing.lowOralGradeCount += record.lowOralGradeCount;
    existing.lowTestTotalCount += record.lowTestTotalCount;
    existing.missedClassCount += record.missedClassCount;
    existing.consecutiveMissedClassCount = Math.max(
      existing.consecutiveMissedClassCount,
      record.consecutiveMissedClassCount,
    );

    if (record.latestSignalDate > existing.latestSignalDate) {
      existing.latestSignalDate = record.latestSignalDate;
      existing.recentLessonId = record.recentLessonId ?? existing.recentLessonId;
    }
  }

  return Array.from(recordsByStudentClass.values())
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

function summarizeGradeRiskRecords(
  testGrades: {
    compositionScore: { toString: () => string };
    oralGrade: string;
    updatedAt: Date;
    writtenTestScore: { toString: () => string };
    class: {
      id: string;
      name: string;
      teacher: {
        name: string;
      };
      lessons: {
        id: string;
      }[];
    };
    student: {
      id: string;
      fullName: string;
    };
  }[],
  resolutions: RiskResolution[],
) {
  const resolutionByStudentClass = new Map(
    resolutions.map((resolution) => [
      `${resolution.classId}:${resolution.studentId}`,
      resolution.resolvedThroughDate,
    ]),
  );
  const records: RiskRecord[] = [];

  for (const grade of testGrades) {
    const key = `${grade.class.id}:${grade.student.id}`;
    const resolvedThroughDate = resolutionByStudentClass.get(key);

    if (resolvedThroughDate && grade.updatedAt <= resolvedThroughDate) {
      continue;
    }

    const testTotal =
      Number(grade.compositionScore) + Number(grade.writtenTestScore);
    const hasLowTestTotal = testTotal < RISK_THRESHOLDS.lowTestTotalScore;
    const hasLowOral = lowOralGrades.has(grade.oralGrade);

    if (!hasLowTestTotal && !hasLowOral) {
      continue;
    }

    records.push({
      classId: grade.class.id,
      className: grade.class.name,
      consecutiveMissedClassCount: 0,
      incompleteHomeworkCount: 0,
      latestSignalDate: grade.updatedAt,
      lowOralGradeCount: hasLowOral ? 1 : 0,
      lowTestTotalCount: hasLowTestTotal ? 1 : 0,
      missedClassCount: 0,
      recentLessonId: grade.class.lessons[0]?.id,
      studentId: grade.student.id,
      studentName: grade.student.fullName,
      teacherName: grade.class.teacher.name,
    });
  }

  return mergeRiskRecords(records);
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
  const t = getTranslations(currentUser.locale);
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

  const [classes, teachers, lessons, testGrades, resolutions] = await Promise.all([
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
    prisma.testGrade.findMany({
      where: {
        student: { isActive: true },
        ...(classId ? { classId } : {}),
        ...(teacherId ? { class: { teacherId } } : {}),
        ...(dateStart || dateEnd
          ? {
              updatedAt: {
                ...(dateStart ? { gte: dateStart } : {}),
                ...(dateEnd ? { lt: dateEnd } : {}),
              },
            }
          : {}),
      },
      select: {
        compositionScore: true,
        oralGrade: true,
        updatedAt: true,
        writtenTestScore: true,
        class: {
          select: {
            id: true,
            name: true,
            teacher: {
              select: {
                name: true,
              },
            },
            lessons: {
              orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
              take: 1,
              where: { status: "SUBMITTED" },
              select: {
                id: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            fullName: true,
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

  const unresolvedRiskRecords = mergeRiskRecords([
    ...summarizeRiskRecords(lessons, resolutions),
    ...summarizeGradeRiskRecords(testGrades, resolutions),
  ]);
  const resolutionByStudentClass = new Map(
    resolutions.map((resolution) => [
      `${resolution.classId}:${resolution.studentId}`,
      resolution.resolvedThroughDate,
    ]),
  );
  const resolvedRiskRecords: RiskRecord[] = [];

  for (const record of mergeRiskRecords([
    ...summarizeRiskRecords(lessons, []),
    ...summarizeGradeRiskRecords(testGrades, []),
  ])) {
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
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="risk-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.adminReview")}</p>
          <h1 id="risk-title">{t("dashboard.studentRisk")}</h1>
          <p className="lede">{t("text.riskReviewCopy")}</p>
          <div className="metric-grid compact-metrics risk-metrics">
            <article className="metric">
              <span>{riskRecords.length}</span>
              <strong>{t("label.flaggedRows")}</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.incompleteHomework}</span>
              <strong>{t("label.homeworkThreshold")}</strong>
            </article>
            <article className="metric">
              <span>{"< 7"}</span>
              <strong>{t("label.testTotalThreshold")}</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.missedClasses}</span>
              <strong>{t("option.attendanceAbsent")}</strong>
            </article>
            <article className="metric">
              <span>{RISK_THRESHOLDS.consecutiveMissedClasses}</span>
              <strong>{t("label.consecutiveMissed")}</strong>
            </article>
          </div>
        </section>

        <section className="panel" aria-label={t("label.riskFilters")}>
          <form className="filter-form">
            <label>
              <span>{t("label.teacher")}</span>
              <select defaultValue={teacherId ?? ""} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.class")}</span>
              <select defaultValue={classId ?? ""} name="classId">
                <option value="">{t("label.allClasses")}</option>
                {classes.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.from")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={dateFrom ?? ""}
                name="dateFrom"
              />
            </label>
            <label>
              <span>{t("label.to")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={dateTo ?? ""}
                name="dateTo"
              />
            </label>
            <label>
              <span>{t("label.resolutionStatus")}</span>
              <select defaultValue={resolutionStatus} name="resolutionStatus">
                <option value="unresolved">{t("label.unresolved")}</option>
                <option value="resolved">{t("label.resolved")}</option>
                <option value="all">{t("label.all")}</option>
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.applyFilters")}
              </button>
              <Link className="text-link" href="/admin/risk">
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-label={t("label.riskReport")}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("label.student")}</th>
                  <th>{t("label.class")}</th>
                  <th>{t("label.teacher")}</th>
                  <th>{t("label.signals")}</th>
                  <th>{t("label.latestSignal")}</th>
                  <th>{t("label.action")}</th>
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
                        {getRiskLabels(record, t).map((label) => (
                          <span className="risk-signal" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {formatShortDate(
                        record.latestSignalDate,
                        currentUser.dateFormat,
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="text-link compact-link"
                          href={`/admin/students/${record.studentId}`}
                        >
                          {t("label.student")}
                        </Link>
                        <Link
                          className="text-link compact-link"
                          href={buildRecordsHref({
                            classId: record.classId,
                            studentId: record.studentId,
                            teacherId,
                          })}
                        >
                          {t("label.records")}
                        </Link>
                        {record.recentLessonId ? (
                          <Link
                            className="text-link compact-link"
                            href={`/admin/records/${record.recentLessonId}`}
                          >
                            {t("label.latest")}
                          </Link>
                        ) : null}
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
                              {t("label.undoResolve")}
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
                              {t("label.resolved")}
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {riskRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6}>{t("message.noRiskMatches")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel data-panel" aria-labelledby="risk-rules-title">
          <h2 id="risk-rules-title">{t("label.defaultRiskRules")}</h2>
          <p className="muted-copy">{t("text.riskRulesCopy")}</p>
        </section>
      </div>
    </main>
  );
}
