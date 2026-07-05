import { redirect } from "next/navigation";

type EditTeacherPageProps = {
  params: Promise<{
    teacherId: string;
  }>;
};

export default async function EditTeacherPage({ params }: EditTeacherPageProps) {
  const { teacherId } = await params;
  redirect(`/admin/manage-accounts/${teacherId}`);
}
