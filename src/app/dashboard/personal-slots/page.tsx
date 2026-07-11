import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TeacherPersonalSlotsRedirect({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    error?: string;
    status?: string;
  }>;
}) {
  const query = await searchParams;
  const dashboardQuery = new URLSearchParams({ dateFilter: "date" });

  if (query.date) dashboardQuery.set("date", query.date);
  if (query.error) dashboardQuery.set("error", query.error);
  if (query.status) dashboardQuery.set("status", query.status);

  redirect(`/dashboard?${dashboardQuery.toString()}#teacher-schedule`);
}
