import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDuration, formatWeekdays } from "@/lib/class-schedule";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

export default async function NewSubstitutionPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const t = getTranslations(currentUser.locale);
  const classes = await prisma.class.findMany({
    where: {
      isActive: true,
      teacherId: {
        not: currentUser.id,
      },
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
  });

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
              <h2>{t("substitution.noClassesAvailable")}</h2>
              <p className="muted-copy">{t("substitution.noClassesCopy")}</p>
            </article>
          ) : null}
        </section>
      </div>
    </main>
  );
}
