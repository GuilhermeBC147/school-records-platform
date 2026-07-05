import Link from "next/link";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import {
  AccountDateFormat,
  defaultAccountDateFormat,
  formatShortDate,
} from "@/lib/date-format";
import {
  formatGradeLabel,
  partialEvaluationPeriods,
  testPeriods,
} from "@/lib/grades";
import { prisma } from "@/lib/prisma";

type StudentProfilePanelProps = {
  basePath: string;
  dateFormat?: AccountDateFormat;
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
) {
  return `${formatShortDate(lesson.lessonDate, dateFormat)} | ${
    lesson.name ?? "Untitled lesson"
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
  selectedClassId,
  studentId,
}: StudentProfilePanelProps) {
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
          <p className="muted-copy">Student class, attendance, and grade overview.</p>
        </div>
      </div>

      <div className="metric-grid compact-metrics student-profile-summary">
        <article className="metric">
          <span>{activeClasses.length}</span>
          <strong>Active classes</strong>
        </article>
        <article className="metric">
          <span>{absentLessons.length}</span>
          <strong>Absences</strong>
        </article>
        <article className="metric">
          <span>
            {latestActiveClassLesson
              ? formatShortDate(latestActiveClassLesson.lessonDate, dateFormat)
              : "-"}
          </span>
          <strong>Last class lesson</strong>
        </article>
      </div>

      <div className="student-profile-section">
        <h3>Current active class</h3>
        <div className="student-class-card-list">
          {activeClasses.map((schoolClass) => {
            const lesson = schoolClass.lessons[0];

            return (
              <article className="student-class-card" key={schoolClass.id}>
                <strong>{schoolClass.name}</strong>
                <span>{schoolClass.teacher.name}</span>
                <small>
                  {formatWeekdays(schoolClass.weekDays)} |{" "}
                  {formatDuration(schoolClass.durationMinutes)}
                </small>
                <small>
                  Last lesson:{" "}
                  {lesson ? lessonLabel(lesson, dateFormat) : "No submitted lessons"}
                </small>
              </article>
            );
          })}
          {activeClasses.length === 0 ? (
            <p className="muted-copy">No active class enrollment.</p>
          ) : null}
        </div>
      </div>

      <div className="data-grid student-profile-grid">
        <article className="data-panel">
          <div className="section-heading-row">
            <div>
              <h2>Absent lessons</h2>
              <p className="muted-copy">Submitted lessons where the student was absent.</p>
            </div>
          </div>
          <div className="student-event-list">
            {absentLessons.map((record) => (
              <article className="student-event-row" key={record.lesson.id}>
                <span>
                  {formatShortDate(record.lesson.lessonDate, dateFormat)}
                </span>
                <strong>{record.lesson.class.name}</strong>
                <small>{record.lesson.name ?? "Untitled lesson"}</small>
              </article>
            ))}
            {absentLessons.length === 0 ? (
              <p className="muted-copy">No absences in submitted records.</p>
            ) : null}
          </div>
        </article>

        <article className="data-panel">
          <div className="section-heading-row">
            <div>
              <h2>Grades</h2>
              <p className="muted-copy">Select an active class to view saved grades.</p>
            </div>
          </div>
          <form className="filter-form compact-filter-form">
            <input name="studentId" type="hidden" value={student.id} />
            <label>
              <span>Class</span>
              <select defaultValue={gradeClassId ?? ""} name="gradeClassId">
                {activeClasses.map((schoolClass) => (
                  <option key={schoolClass.id} value={schoolClass.id}>
                    {schoolClass.name}
                  </option>
                ))}
                {activeClasses.length === 0 ? (
                  <option value="">No active classes</option>
                ) : null}
              </select>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                View grades
              </button>
              <Link className="text-link" href={basePath}>
                Clear
              </Link>
            </div>
          </form>

          {selectedClass ? (
            <div className="student-grade-cards">
              <div className="student-grade-group">
                <h3>Partial evaluations</h3>
                <div className="student-grade-card-row">
                  {partialEvaluationPeriods.map((period) => {
                    const grade = findPartialGrade(partialGrades, period.value);

                    return (
                      <article className="student-grade-card" key={period.value}>
                        <span>{period.label}</span>
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
                      <span>{period.label}</span>
                      <strong>{testTotal(grade)}</strong>
                      <small>Total</small>
                    </div>
                    <div className="student-test-breakdown">
                      <div className="student-score-item">
                        <span>Oral</span>
                        <strong>{grade ? formatGradeLabel(grade.oralGrade) : "-"}</strong>
                      </div>
                      <div className="student-score-item">
                        <span>Composition</span>
                        <strong>{grade ? formatScore(grade.compositionScore) : "-"}</strong>
                      </div>
                      <div className="student-score-item">
                        <span>Written</span>
                        <strong>{grade ? formatScore(grade.writtenTestScore) : "-"}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted-copy">No active class available for grades.</p>
          )}
        </article>
      </div>
    </section>
  );
}
