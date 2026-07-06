import Link from "next/link";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import {
  AccountDateFormat,
  defaultAccountDateFormat,
  formatShortDate,
} from "@/lib/date-format";
import {
  formatGradeLabel,
  formatPartialEvaluationPeriodLabel,
  formatTestPeriodLabel,
  partialEvaluationPeriods,
  testPeriods,
} from "@/lib/grades";
import { defaultAccountLocale, type AccountLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { getTranslations } from "@/lib/translations";

type StudentProfilePanelProps = {
  basePath: string;
  dateFormat?: AccountDateFormat;
  locale?: AccountLocale;
  selectedClassId?: string;
  studentId: string;
};

type LessonSummary = {
  id: string;
  lessonDate: Date;
  name: string | null;
};

function lessonLabel(
  lesson: LessonSummary,
  dateFormat: AccountDateFormat = defaultAccountDateFormat,
  locale: AccountLocale = defaultAccountLocale,
) {
  const t = getTranslations(locale);

  return `${formatShortDate(lesson.lessonDate, dateFormat)} | ${
    lesson.name ?? t("adminReview.untitledLesson")
  }`;
}

function formatScore(score: { toString: () => string }) {
  return score.toString().replace(/\.00$/, "");
}

function testTotal(
  grade: {
    compositionScore: { toString: () => string };
    writtenTestScore: { toString: () => string };
  } | null,
) {
  if (!grade) {
    return "-";
  }

  return (Number(grade.compositionScore) + Number(grade.writtenTestScore))
    .toFixed(2)
    .replace(/\.00$/, "");
}

function findPartialGrade(
  grades: { grade: string; period: string }[],
  period: string,
) {
  return grades.find((grade) => grade.period === period)?.grade ?? "";
}

function findTestGrade<
  T extends {
    compositionScore: { toString: () => string };
    oralGrade: string;
    period: string;
    writtenTestScore: { toString: () => string };
  },
>(grades: T[], period: string) {
  return grades.find((grade) => grade.period === period) ?? null;
}

export async function StudentProfilePanel({
  basePath,
  dateFormat = defaultAccountDateFormat,
  locale = defaultAccountLocale,
  selectedClassId,
  studentId,
}: StudentProfilePanelProps) {
  const t = getTranslations(locale);
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      fullName: true,
      enrollments: {
        where: { status: "ACTIVE", class: { isActive: true } },
        orderBy: { class: { name: "asc" } },
        select: {
          id: true,
          class: {
            select: {
              id: true,
              durationMinutes: true,
              name: true,
              teacher: { select: { name: true } },
              weekDays: true,
              lessons: {
                orderBy: [{ lessonDate: "desc" }, { updatedAt: "desc" }],
                take: 1,
                where: { status: "SUBMITTED" },
                select: { id: true, lessonDate: true, name: true },
              },
            },
          },
        },
      },
      partialEvaluationGrades: {
        select: { classId: true, grade: true, period: true },
      },
      testGrades: {
        select: {
          classId: true,
          compositionScore: true,
          oralGrade: true,
          period: true,
          writtenTestScore: true,
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  const absentLessons = await prisma.attendanceRecord.findMany({
    where: {
      status: "ABSENT",
      studentId,
      lesson: { status: "SUBMITTED" },
    },
    orderBy: { lesson: { lessonDate: "desc" } },
    select: {
      lesson: {
        select: {
          id: true,
          lessonDate: true,
          name: true,
          class: { select: { id: true, name: true } },
        },
      },
    },
  });
  const activeClasses = student.enrollments.map((enrollment) => enrollment.class);
  const gradeClassId =
    selectedClassId && activeClasses.some((schoolClass) => schoolClass.id === selectedClassId)
      ? selectedClassId
      : activeClasses[0]?.id;
  const partialGrades = student.partialEvaluationGrades.filter(
    (grade) => grade.classId === gradeClassId,
  );
  const testGrades = student.testGrades.filter(
    (grade) => grade.classId === gradeClassId,
  );
  const selectedClass = activeClasses.find(
    (schoolClass) => schoolClass.id === gradeClassId,
  );
  const latestActiveClassLesson = activeClasses
    .map((schoolClass) => schoolClass.lessons[0])
    .filter((lesson): lesson is LessonSummary => Boolean(lesson))
    .sort(
      (first, second) =>
        second.lessonDate.getTime() - first.lessonDate.getTime(),
    )[0];

  return (
    <section className="panel data-panel" aria-labelledby="student-profile-title">
      <div className="section-heading-row">
        <div>
          <h2 id="student-profile-title">{student.fullName}</h2>
          <p className="muted-copy">{t("receptionLookup.studentOverview")}</p>
        </div>
      </div>

      <div className="metric-grid compact-metrics student-profile-summary">
        <article className="metric">
          <span>{activeClasses.length}</span>
          <strong>{t("dashboard.activeClasses")}</strong>
        </article>
        <article className="metric">
          <span>{absentLessons.length}</span>
          <strong>{t("receptionLookup.absences")}</strong>
        </article>
        <article className="metric">
          <span>
            {latestActiveClassLesson
              ? formatShortDate(latestActiveClassLesson.lessonDate, dateFormat)
              : "-"}
          </span>
          <strong>{t("receptionLookup.lastClassLesson")}</strong>
        </article>
      </div>

      <div className="student-profile-section">
        <h3>{t("receptionLookup.currentActiveClass")}</h3>
        <div className="student-class-card-list">
          {activeClasses.map((schoolClass) => {
            const lesson = schoolClass.lessons[0];

            return (
              <article className="student-class-card" key={schoolClass.id}>
                <strong>{schoolClass.name}</strong>
                <span>{schoolClass.teacher.name}</span>
                <small>
                  {formatWeekdays(schoolClass.weekDays, locale)} |{" "}
                  {formatDuration(schoolClass.durationMinutes)}
                </small>
                <small>
                  {t("receptionLookup.lastLesson")}:{" "}
                  {lesson
                    ? lessonLabel(lesson, dateFormat, locale)
                    : t("receptionLookup.noSubmittedLessons")}
                </small>
              </article>
            );
          })}
          {activeClasses.length === 0 ? (
            <p className="muted-copy">{t("receptionLookup.noActiveClassEnrollment")}</p>
          ) : null}
        </div>
      </div>

      <div className="data-grid student-profile-grid">
        <article className="data-panel">
          <div className="section-heading-row">
            <div>
              <h2>{t("receptionLookup.absentLessons")}</h2>
              <p className="muted-copy">{t("receptionLookup.absentLessonsCopy")}</p>
            </div>
          </div>
          <div className="student-event-list">
            {absentLessons.map((record) => (
              <article className="student-event-row" key={record.lesson.id}>
                <span>
                  {formatShortDate(record.lesson.lessonDate, dateFormat)}
                </span>
                <strong>{record.lesson.class.name}</strong>
                <small>
                  {record.lesson.name ?? t("adminReview.untitledLesson")}
                </small>
              </article>
            ))}
            {absentLessons.length === 0 ? (
              <p className="muted-copy">{t("receptionLookup.noAbsences")}</p>
            ) : null}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-heading-row">
            <div>
              <h2>{t("label.grades")}</h2>
              <p className="muted-copy">{t("receptionLookup.gradesCopy")}</p>
            </div>
          </div>
          <form className="filter-form compact-filter-form">
            <input name="studentId" type="hidden" value={student.id} />
            <label>
              <span>{t("label.class")}</span>
              <select defaultValue={gradeClassId ?? ""} name="gradeClassId">
                {activeClasses.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
                {activeClasses.length === 0 ? (
                  <option value="">{t("receptionLookup.noActiveClasses")}</option>
                ) : null}
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("receptionLookup.viewGrades")}
              </button>
              <Link className="text-link" href={basePath}>
                {t("label.clear")}
              </Link>
            </div>
          </form>

          {selectedClass ? (
            <div className="student-grade-cards">
              <div className="student-grade-group">
                <h3>{t("receptionLookup.partialEvaluations")}</h3>
                <div className="student-grade-card-row">
                  {partialEvaluationPeriods.map((period) => {
                    const grade = findPartialGrade(partialGrades, period.value);

                    return (
                      <article className="student-grade-card" key={period.value}>
                        <span>
                          {formatPartialEvaluationPeriodLabel(period.value, locale)}
                        </span>
                        <strong>{grade ? formatGradeLabel(grade) : "-"}</strong>
                      </article>
                    );
                  })}
                </div>
              </div>

              {testPeriods.map((period) => {
                const grade = findTestGrade(testGrades, period.value);

                return (
                  <article className="student-test-card" key={period.value}>
                    <div className="student-test-total">
                      <span>{formatTestPeriodLabel(period.value, locale)}</span>
                      <strong>{testTotal(grade)}</strong>
                      <small>{t("label.testTotal")}</small>
                    </div>
                    <div className="student-test-breakdown">
                      <div className="student-score-item">
                        <span>{t("label.oral")}</span>
                        <strong>{grade ? formatGradeLabel(grade.oralGrade) : "-"}</strong>
                      </div>
                      <div className="student-score-item">
                        <span>{t("label.composition")}</span>
                        <strong>{grade ? formatScore(grade.compositionScore) : "-"}</strong>
                      </div>
                      <div className="student-score-item">
                        <span>{t("label.written")}</span>
                        <strong>{grade ? formatScore(grade.writtenTestScore) : "-"}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">{t("receptionLookup.noActiveClassAvailable")}</p>
          )}
        </article>
      </div>
    </section>
  );
}
