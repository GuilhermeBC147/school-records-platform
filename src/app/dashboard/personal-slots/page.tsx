import Link from "next/link";
import { redirect } from "next/navigation";
import { confirmPersonalSlotBookingAction } from "@/app/actions/personal-slots";
import { AppTopbar } from "@/app/components/app-topbar";
import { formatStartTime } from "@/lib/bonus-classes";
import { formatDuration } from "@/lib/class-schedule";
import { formatShortDate } from "@/lib/date-format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { getTranslations } from "@/lib/translations";

export const dynamic = "force-dynamic";

function monthRange() {
  const now = new Date();
  return {
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
  };
}

export default async function TeacherPersonalSlotsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.role !== "TEACHER") redirect("/dashboard");

  const query = await searchParams;
  const t = getTranslations(currentUser.locale);
  const range = monthRange();
  const bookings = await prisma.personalSlotBooking.findMany({
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    where: {
      teacherId: currentUser.id,
      scheduledDate: { gte: range.start, lt: range.end },
      status: { not: "CANCELED" },
    },
    select: {
      attendanceStatus: true,
      durationMinutes: true,
      id: true,
      purpose: true,
      scheduledDate: true,
      startTime: true,
      status: true,
      student: { select: { fullName: true } },
    },
  });
  const attendanceLabel = (status: string) => {
    switch (status) {
      case "PRESENT":
        return t("personalSlots.present");
      case "ABSENT":
        return t("personalSlots.absent");
      case "EXCUSED":
        return t("personalSlots.excused");
      default:
        return t("personalSlots.attendancePending");
    }
  };

  return (
    <main className="app-shell">
      <AppTopbar currentUser={currentUser} />
      <div className="main data-page">
        <section className="intro" aria-labelledby="teacher-personal-slots-title">
          <Link className="text-link" href="/dashboard">
            {t("label.backToDashboard")}
          </Link>
          <p className="eyebrow">{t("personalSlots.personalBooths")}</p>
          <h1 id="teacher-personal-slots-title">{t("personalSlots.teacherTitle")}</h1>
          <p className="lede">{t("personalSlots.teacherCopy")}</p>
        </section>

        {query.error ? (
          <p className="form-error">{t("personalSlots.confirmError")}</p>
        ) : null}
        {query.status === "confirmed" ? (
          <p className="form-success">{t("personalSlots.confirmed")}</p>
        ) : null}

        <section className="panel data-panel" aria-labelledby="assigned-personal-slots-title">
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">{t("dashboard.monthlySummary")}</p>
              <h2 id="assigned-personal-slots-title">{t("personalSlots.assignedTitle")}</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("label.date")}</th>
                  <th>{t("label.time")}</th>
                  <th>{t("label.student")}</th>
                  <th>{t("personalSlots.purpose")}</th>
                  <th>{t("label.duration")}</th>
                  <th>{t("personalSlots.attendance")}</th>
                  <th>{t("label.action")}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{formatShortDate(booking.scheduledDate, currentUser.dateFormat)}</td>
                    <td>{formatStartTime(booking.startTime)}</td>
                    <td>{booking.student.fullName}</td>
                    <td>{booking.purpose}</td>
                    <td>{formatDuration(booking.durationMinutes)}</td>
                    <td>{attendanceLabel(booking.attendanceStatus)}</td>
                    <td>
                      {booking.status === "SCHEDULED" ? (
                        <form action={confirmPersonalSlotBookingAction} className="table-actions">
                          <input name="bookingId" type="hidden" value={booking.id} />
                          <select defaultValue="PRESENT" name="attendanceStatus">
                            <option value="PRESENT">{t("personalSlots.present")}</option>
                            <option value="ABSENT">{t("personalSlots.absent")}</option>
                            <option value="EXCUSED">{t("personalSlots.excused")}</option>
                          </select>
                          <button className="primary-button" type="submit">
                            {t("personalSlots.confirmAttendance")}
                          </button>
                        </form>
                      ) : (
                        t("personalSlots.completed")
                      )}
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7}>{t("personalSlots.noAssignedBookings")}</td>
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
