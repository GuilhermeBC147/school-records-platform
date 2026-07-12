import { StaffCalendarPage } from "@/app/components/staff-calendar-page";

type AdminCalendarPageProps = {
  searchParams: Promise<{
    date?: string;
    teacherId?: string;
  }>;
};

export default function AdminCalendarPage({
  searchParams,
}: AdminCalendarPageProps) {
  return <StaffCalendarPage pageRole="ADMIN" searchParams={searchParams} />;
}
