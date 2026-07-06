import Link from "next/link";
import { redirect } from "next/navigation";
import {
  cancelBonusClassAction,
  createBonusClassAction,
} from "@/app/actions/bonus-classes";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import {
  formatBonusClassErrorMessage,
  formatBonusClassResultMessage,
  formatBonusClassStatus,
  formatStartTime,
} from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type ReceptionBonusClassesPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

export default async function ReceptionBonusClassesPage({
  searchParams,
}: ReceptionBonusClassesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const errorMessage = formatBonusClassErrorMessage(query.error, currentUser.locale);
  const successMessage = formatBonusClassResultMessage(query.status, currentUser.locale);
  const [bonusClasses, students, teachers] = await Promise.all([
    prisma.bonusClass.findMany({
      orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
      take: 50,
      select: {
        id: true,
        attendanceStatus: true,
        durationMinutes: true,
        notes: true,
        scheduledDate: true,
        startTime: true,
        status: true,
        subject: true,
        student: {
          select: { fullName: true },
        },
        teacher: {
          select: { name: true },
        },
      },
    }),
    prisma.student.findMany({
      orderBy: { fullName: "asc" },
      where: { isActive: true },
      select: {
        id: true,
        fullName: true,
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      where: {
        isActive: true,
        role: "TEACHER",
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="bonus-title">
          <Link className="text-link" href="/reception">
            {t("label.backToReception")}
          </Link>
          <p className="eyebrow">{t("dashboard.reception")}</p>
          <h1 id="bonus-title">{t("label.scheduleBonusClass")}</h1>
          <p className="lede">{t("text.scheduleBonusCopy")}</p>
          <div className="action-row">
            {currentUser.role === "ADMIN" ? (
              <Link className="secondary-link" href="/dashboard">
                {t("label.backToDashboard")}
              </Link>
            ) : null}
            <Link className="primary-link" href="/reception/calendar">
              {t("label.view")} {t("dashboard.calendar").toLowerCase()}
            </Link>
          </div>
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <section className="panel data-panel" aria-labelledby="new-bonus-title">
          <h2 id="new-bonus-title">{t("label.bonusClassDetails")}</h2>
          <form action={createBonusClassAction} className="admin-form">
            <label>
              <span>{t("label.studentSearch")}</span>
              <input
                autoComplete="off"
                list="bonus-students"
                name="studentSearch"
                placeholder={t("receptionLookup.studentSearchPlaceholder")}
                required
                type="search"
              />
              <datalist id="bonus-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <label>
              <span>{t("label.subject")}</span>
              <input name="subject" required type="text" />
            </label>
            <label>
              <span>{t("label.teacher")}</span>
              <select name="teacherId" required>
                <option value="">{t("label.chooseTeacher")}</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                name="scheduledDate"
                required
              />
            </label>
            <label>
              <span>{t("label.startTime")}</span>
              <TimeInput name="startTime" required />
            </label>
            <label>
              <span>{t("label.duration")}</span>
              <DurationInput name="durationMinutes" required />
            </label>
            <label>
              <span>{t("label.notes")}</span>
              <textarea name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("label.scheduleBonusClass")}
              </button>
            </div>
          </form>
        </section>

        <section className="panel data-panel" aria-labelledby="scheduled-title">
          <h2 id="scheduled-title">{t("label.recentBonusClasses")}</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("label.date")}</th>
                  <th>{t("label.time")}</th>
                  <th>{t("label.student")}</th>
                  <th>{t("label.subject")}</th>
                  <th>{t("label.teacher")}</th>
                  <th>{t("label.duration")}</th>
                  <th>{t("label.status")}</th>
                  <th>{t("label.attendance")}</th>
                  <th>{t("label.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {bonusClasses.map((bonusClass) => (
                  <tr key={bonusClass.id}>
                    <td>
                      {formatShortDate(
                        bonusClass.scheduledDate,
                        currentUser.dateFormat,
                      )}
                    </td>
                    <td>{formatStartTime(bonusClass.startTime)}</td>
                    <td>{bonusClass.student.fullName}</td>
                    <td>{bonusClass.subject}</td>
                    <td>{bonusClass.teacher.name}</td>
                    <td>{formatDuration(bonusClass.durationMinutes)}</td>
                    <td>{formatBonusClassStatus(bonusClass.status, currentUser.locale)}</td>
                    <td>{formatBonusClassStatus(bonusClass.attendanceStatus, currentUser.locale)}</td>
                    <td>
                      <div className="table-actions">
                        <Link
                          className="text-link"
                          href={`/reception/bonus-classes/${bonusClass.id}`}
                        >
                          {t("label.open")}
                        </Link>
                        {bonusClass.status === "SCHEDULED" ? (
                          <form action={cancelBonusClassAction}>
                            <input
                              name="bonusClassId"
                              type="hidden"
                              value={bonusClass.id}
                            />
                            <button className="secondary-button" type="submit">
                              {t("label.cancel")}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {bonusClasses.length === 0 ? (
                  <tr>
                    <td colSpan={9}>{t("message.noBonusClassesScheduled")}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
