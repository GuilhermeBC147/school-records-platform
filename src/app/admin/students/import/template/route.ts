import { NextResponse } from "next/server";
import { buildStudentTemplateCsv } from "@/lib/imports";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (currentUser.role !== "ADMIN") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse(buildStudentTemplateCsv(), {
    headers: {
      "Content-Disposition": 'attachment; filename="student-import-template.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
