import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  completeBonusClassAction,
  updateBonusClassAction,
} from "@/app/actions/bonus-classes";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { TimeInput } from "@/app/components/time-input";
import {
  formatBonusClassErrorMessage,
  formatBonusClassResultMessage,
  formatBonusClassStatus,
} from "@/lib/bonus-classes";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";
import { AppTopbar } from "@/app/components/app-topbar";

export const dynamic = "force-dynamic";

type EditBonusClassPageProps = {
  params: Promise<{
    bonusClassId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
};

function dateInputValue(date: Date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${year}-${month}-${day}`;
}

export default async function EditBonusClassPage({
  params,
  searchParams,
}: EditBonusClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (
    currentUser.role !== "RECEPTION" &&
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "TEACHER"
  ) {
    redirect("/dashboard");
  }

  const { bonusClassId } = await params;
  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const errorMessage = formatBonusClassErrorMessage(query.error, currentUser.locale);
  const successMessage = formatBonusClassResultMessage(query.status, currentUser.locale);
  const [bonusClass, students, teachers] = await Promise.all([
    prisma.bonusClass.findFirst({
      where: {
        id: bonusClassId,
        ...(currentUser.role === "TEACHER" ? { teacherId: currentUser.id } : {}),
      },
      select: {
        attendanceStatus: true,
        id: true,
        durationMinutes: true,
        notes: true,
        scheduledDate: true,
        startTime: true,
        studentId: true,
        subject: true,
        teacherId: true,
        teacher: {
          select: { name: true },
        },
        student: {
          select: { fullName: true },
        },
        status: true,
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

  if (!bonusClass) {
    notFound();
  }

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />

      <div className="main data-page">
        <section className="intro" aria-labelledby="edit-bonus-title">
          <Link className="text-link" href="/reception/calendar">
            {t("label.backToCalendar")}
          </Link>
          <p className="eyebrow">{currentUser.role.toLowerCase()}</p>
          <h1 id="edit-bonus-title">{t("label.editBonusClass")}</h1>
          <p className="lede">
            {bonusClass.student.fullName} {t("dashboard.withTeacher")} {bonusClass.teacher.name}
          </p>
          <p className="muted-copy">
            {t("label.status")}:{" "}
            {formatBonusClassStatus(bonusClass.status, currentUser.locale)} |{" "}
            {t("label.attendance")}:{" "}
            {formatBonusClassStatus(bonusClass.attendanceStatus, currentUser.locale)}
          </p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                {t("label.backToDashboard")}
              </Link>
            </div>
          ) : null}
        </section>

        {successMessage ? <p className="form-success">{successMessage}</p> : null}
        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <section className="panel data-panel" aria-label={t("label.bonusClassDetails")}>
          <form action={updateBonusClassAction} className="admin-form">
            <input name="bonusClassId" type="hidden" value={bonusClass.id} />
            <label>
              <span>{t("label.student")}</span>
              <select
                defaultValue={bonusClass.studentId}
                disabled={currentUser.role === "TEACHER"}
                name="studentId"
                required
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
              {currentUser.role === "TEACHER" ? (
                <input name="studentId" type="hidden" value={bonusClass.studentId} />
              ) : null}
            </label>
            <label>
              <span>{t("label.subject")}</span>
              <input defaultValue={bonusClass.subject} name="subject" required type="text" />
            </label>
            <label>
              <span>{t("label.teacher")}</span>
              <select
                defaultValue={bonusClass.teacherId}
                disabled={currentUser.role === "TEACHER"}
                name="teacherId"
                required
              >
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
              {currentUser.role === "TEACHER" ? (
                <input name="teacherId" type="hidden" value={bonusClass.teacherId} />
              ) : null}
            </label>
            <label>
              <span>{t("label.date")}</span>
              <DateInput
                calendarLabel={t("dashboard.calendar")}
                dateFormat={currentUser.dateFormat}
                defaultValue={dateInputValue(bonusClass.scheduledDate)}
                name="scheduledDate"
                required
              />
            </label>
            <label>
              <span>{t("label.startTime")}</span>
              <TimeInput
                defaultValue={bonusClass.startTime}
                name="startTime"
                required
              />
            </label>
            <label>
              <span>{t("label.duration")}</span>
              <DurationInput
                name="durationMinutes"
                required
                valueMinutes={bonusClass.durationMinutes}
              />
            </label>
            <label>
              <span>{t("label.notes")}</span>
              <textarea defaultValue={bonusClass.notes ?? ""} name="notes" rows={3} />
            </label>
            <div className="record-actions">
              <button className="primary-button" type="submit">
                {t("label.saveBonusClass")}
              </button>
            </div>
          </form>
        </section>

        {bonusClass.status !== "CANCELED" ? (
          <section className="panel data-panel" aria-labelledby="attendance-title">
            <h2 id="attendance-title">{t("label.attendanceConfirmation")}</h2>
            <form action={completeBonusClassAction} className="admin-form">
              <input name="bonusClassId" type="hidden" value={bonusClass.id} />
              <input
                name="redirectTo"
                type="hidden"
                value={`/reception/bonus-classes/${bonusClass.id}?status=attendance`}
              />
              <label>
                <span>{t("label.attendance")}</span>
                <select
                  defaultValue={
                    bonusClass.attendanceStatus === "PENDING"
                      ? "PRESENT"
                      : bonusClass.attendanceStatus
                  }
                  name="attendanceStatus"
                  required
                >
                  <option value="PRESENT">{t("option.attendancePresent")}</option>
                  <option value="ABSENT">{t("option.attendanceAbsent")}</option>
                  <option value="EXCUSED">{t("option.attendanceExcused")}</option>
                </select>
              </label>
              <div className="record-actions">
                <button className="primary-button" type="submit">
                  {t("label.confirmAttendance")}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
