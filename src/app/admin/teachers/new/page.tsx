import { redirect } from "next/navigation";

export default function NewTeacherPage() {
  redirect("/admin/manage-accounts/new");
}
