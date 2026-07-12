import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPersonalSlotBookingAction,
  updatePersonalSlotBookingStatusAction,
} from "@/app/actions/personal-slots";
import { AppTopbar } from "@/app/components/app-topbar";
import { DateInput } from "@/app/components/date-input";
import { DurationInput } from "@/app/components/duration-input";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { TimeInput } from "@/app/components/time-input";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function PersonalSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" && user.role !== "RECEPTION") redirect("/dashboard");

  const query = await searchParams;
  const t = getTranslations(user.locale);
  const [students, teachers, bookings] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: "TEACHER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.personalSlotBooking.findMany({
      take: 100,
      orderBy: [{ scheduledDate: "desc" }, { startTime: "asc" }],
      include: {
        student: { select: { fullName: true } },
        teacher: { select: { name: true } },
      },
    }),
  ]);
  const statusLabel = (status: string) =>
    status === "COMPLETED"
      ? t("personalSlots.completed")
      : status === "CANCELED"
        ? t("personalSlots.canceled")
        : t("personalSlots.scheduled");
  const attendanceLabel = (status: string) =>
    status === "PRESENT"
      ? t("personalSlots.present")
      : status === "ABSENT"
        ? t("personalSlots.absent")
        : status === "EXCUSED"
          ? t("personalSlots.excused")
          : t("personalSlots.attendancePending");
  const studentPickerLabels = {
    inactive: t("label.inactive"),
    noMatches: t("adminClasses.noStudentsMatchSearch"),
    search: t("adminClasses.searchStudents"),
    searchHint: t("adminClasses.rosterSearchHint"),
    searchPlaceholder: t("receptionLookup.studentSearchPlaceholder"),
    selected: t("adminClasses.selected"),
    shown: t("adminClasses.shown"),
  };

  return (
    <main className="app-shell">
      <AppTopbar currentUser={user} />
      <div className="main data-page">
        <section className="intro">
          <Link className="text-link" href={user.role === "ADMIN" ? "/dashboard" : "/reception"}>
            {t("personalSlots.back")}
          </Link>
          <p className="eyebrow">{t("personalSlots.personalBooths")}</p>
          <h1>{t("personalSlots.title")}</h1>
          <p className="lede">{t("personalSlots.copy")}</p>
        </section>

        {query.error ? (
          <p className="form-error">
            {t(query.error === "capacity" ? "personalSlots.capacityError" : "personalSlots.invalidError")}
          </p>
        ) : null}
        {query.status ? <p className="form-success">{t("personalSlots.saved")}</p> : null}

        <section className="panel data-panel">
          <h2>{t("personalSlots.bookBooth")}</h2>
          <form action={createPersonalSlotBookingAction} className="admin-form">
            <RosterPicker
              emptyMessage={t("adminClasses.noStudentsCreated")}
              labels={studentPickerLabels}
              selectionName="studentId"
              singleSelection
              students={students.map((student) => ({ ...student, isActive: true }))}
            />
            <label><span>{t("personalSlots.purpose")}</span><input name="purpose" placeholder={t("personalSlots.purposePlaceholder")} required type="text" /></label>
            <label><span>{t("label.teacher")}</span><select name="teacherId" required><option value="">{t("label.chooseTeacher")}</option>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label>
            <label><span>{t("label.date")}</span><DateInput calendarLabel={t("dashboard.calendar")} dateFormat={user.dateFormat} hideFormatHint name="scheduledDate" required /></label>
            <label><span>{t("label.startTime")}</span><TimeInput name="startTime" required /></label>
            <label><span>{t("label.duration")}</span><DurationInput name="durationMinutes" required /></label>
            <label><span>{t("label.notes")}</span><textarea name="notes" rows={3} /></label>
            <button className="primary-button" type="submit">{t("personalSlots.book")}</button>
          </form>
        </section>

        <section className="panel data-panel">
          <h2>{t("personalSlots.recentBookings")}</h2>
          <div className="table-wrap"><table><thead><tr><th>{t("label.date")}</th><th>{t("label.time")}</th><th>{t("label.student")}</th><th>{t("personalSlots.purpose")}</th><th>{t("label.teacher")}</th><th>{t("label.duration")}</th><th>{t("personalSlots.status")}</th><th>{t("personalSlots.attendance")}</th><th>{t("personalSlots.actions")}</th></tr></thead><tbody>
            {bookings.map((booking) => <tr key={booking.id}><td>{formatShortDate(booking.scheduledDate, user.dateFormat)}</td><td>{formatStartTime(booking.startTime)}</td><td>{booking.student.fullName}</td><td>{booking.purpose}</td><td>{booking.teacher.name}</td><td>{formatDuration(booking.durationMinutes)}</td><td>{statusLabel(booking.status)}</td><td>{attendanceLabel(booking.attendanceStatus)}</td><td>{booking.status === "SCHEDULED" ? <div className="table-actions"><form action={updatePersonalSlotBookingStatusAction}><input type="hidden" name="bookingId" value={booking.id} /><button className="primary-button" name="status" value="COMPLETED">{t("personalSlots.complete")}</button></form><form action={updatePersonalSlotBookingStatusAction}><input type="hidden" name="bookingId" value={booking.id} /><button className="secondary-button" name="status" value="CANCELED">{t("label.cancel")}</button></form></div> : null}</td></tr>)}
          </tbody></table></div>
        </section>
      </div>
    </main>
  );
}
