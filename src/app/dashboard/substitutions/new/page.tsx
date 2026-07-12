import Link from "next/link";
import { redirect } from "next/navigation";
import {
  formatDuration,
  formatWeekdays,
  weekdayOptions,
} from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";
import type { Weekday } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type NewSubstitutionPageProps = {
  searchParams: Promise<{
    teacherId?: string | string[];
    weekDay?: string | string[];
    weekDayFilter?: string | string[];
  }>;
};

const substitutionWeekdayOptions = weekdayOptions.filter(
  (option) => option.value !== "SUNDAY",
);

function readQueryValue(value: string | string[] | undefined) {
  const firstValue = Array.isArray(value) ? value[0] : value;

  return firstValue?.trim() ?? "";
}

function readQueryValues(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(values.map((item) => item.trim()).filter(Boolean)),
  );
}

function readWeekdays(values: string[]) {
  const allowedWeekdays = new Set<string>(
    substitutionWeekdayOptions.map((option) => option.value),
  );

  return values.filter((value): value is Weekday =>
    allowedWeekdays.has(value),
  );
}

function getCurrentWeekday() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  return substitutionWeekdayOptions.some((option) => option.value === weekday)
    ? (weekday as Weekday)
    : undefined;
}

export default async function NewSubstitutionPage({
  searchParams,
}: NewSubstitutionPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const selectedTeacherId = readQueryValue(query.teacherId);
  const submittedWeekdayValues = readQueryValues(query.weekDay);
  const hasSubmittedWeekdayFilter =
    readQueryValue(query.weekDayFilter) === "custom" ||
    submittedWeekdayValues.length > 0;
  const selectedWeekdays = hasSubmittedWeekdayFilter
    ? readWeekdays(submittedWeekdayValues)
    : (() => {
        const currentWeekday = getCurrentWeekday();

        return currentWeekday ? [currentWeekday] : [];
      })();
  const selectedWeekdaySet = new Set(selectedWeekdays);
  const hasFilters = Boolean(
    selectedTeacherId || selectedWeekdays.length > 0,
  );
  const [teachers, classes] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { not: currentUser.id },
        isActive: true,
        role: "TEACHER",
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.class.findMany({
      where: {
        isActive: true,
        teacherId: selectedTeacherId
          ? { equals: selectedTeacherId, not: currentUser.id }
          : { not: currentUser.id },
        ...(selectedWeekdays.length > 0
          ? {
              weekDays: { hasSome: selectedWeekdays },
            }
          : {}),
      },
      orderBy: [{ teacher: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        book: true,
        durationMinutes: true,
        semester: true,
        weekDays: true,
        year: true,
        teacher: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="substitution-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("label.teacherWork")}</p>
          <h1 id="substitution-title">{t("dashboard.substituteLesson")}</h1>
          <p className="lede">{t("substitution.chooseClassCopy")}</p>
        </section>

        <section
          className="panel filter-panel substitution-filter-panel"
          aria-labelledby="substitution-filters-title"
        >
          <div className="filter-panel-heading">
            <div>
              <h2 id="substitution-filters-title">
                {t("dashboard.classFilters")}
              </h2>
              <p className="muted-copy">{t("substitution.filterCopy")}</p>
            </div>
          </div>
          <form className="filter-form substitution-filter-form">
            <input name="weekDayFilter" type="hidden" value="custom" />
            <label>
              <span>{t("adminReview.primaryTeacher")}</span>
              <select defaultValue={selectedTeacherId} name="teacherId">
                <option value="">{t("label.allTeachers")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <div
              aria-labelledby="substitution-weekdays-label"
              className="weekday-filter"
              role="group"
            >
              <span
                className="form-section-label"
                id="substitution-weekdays-label"
              >
                {t("receptionLookup.weekdays")}
              </span>
              <div
                className="weekday-picker compact-weekday-picker substitution-weekday-picker"
              >
                {substitutionWeekdayOptions.map((weekday) => (
                  <label className="checkbox-label" key={weekday.value}>
                    <input
                      defaultChecked={selectedWeekdaySet.has(weekday.value)}
                      name="weekDay"
                      type="checkbox"
                      value={weekday.value}
                    />
                    <span>
                      {formatWeekdays([weekday.value], currentUser.locale)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                {t("label.applyFilters")}
              </button>
              <Link
                className="text-link"
                href="/dashboard/substitutions/new?weekDayFilter=custom"
              >
                {t("label.clear")}
              </Link>
            </div>
          </form>
        </section>

        <section
          className="class-grid"
          aria-label={t("substitution.availableClasses")}
        >
          {classes.map((schoolClass) => (
            <article className="panel class-card" key={schoolClass.id}>
              <div>
                <p className="eyebrow">
                  {schoolClass.book ?? t("label.class")}
                  {schoolClass.semester && schoolClass.year
                    ? ` | ${t("dashboard.semester")} ${schoolClass.semester}/${schoolClass.year}`
                    : ""}
                </p>
                <h2>{schoolClass.name}</h2>
                <p>
                  {t("adminReview.primaryTeacher")}: {schoolClass.teacher.name}
                </p>
                <p>
                  {formatWeekdays(schoolClass.weekDays, currentUser.locale)} |{" "}
                  {formatDuration(schoolClass.durationMinutes)}
                </p>
              </div>
              <Link
                className="primary-link"
                href={`/dashboard/classes/${schoolClass.id}/record?substitute=1`}
              >
                {t("substitution.recordSubstituteLesson")}
              </Link>
            </article>
          ))}
          {classes.length === 0 ? (
            <article className="panel data-panel">
              <h2>
                {hasFilters
                  ? t("adminClasses.noClassesMatch")
                  : t("substitution.noClassesAvailable")}
              </h2>
              <p className="muted-copy">
                {hasFilters
                  ? t("substitution.noClassesMatchCopy")
                  : t("substitution.noClassesCopy")}
              </p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
