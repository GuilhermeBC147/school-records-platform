import { StaffCalendarPage } from "@/app/components/staff-calendar-page";

type ReceptionCalendarPageProps = {
  searchParams: Promise<{
    date?: string;
    teacherId?: string;
  }>;
};

export default function ReceptionCalendarPage({
  searchParams,
}: ReceptionCalendarPageProps) {
  return <StaffCalendarPage pageRole="RECEPTION" searchParams={searchParams} />;
}
