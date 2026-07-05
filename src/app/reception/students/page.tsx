import Link from "next/link";
import { redirect } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { StudentProfilePanel } from "@/app/components/student-profile-panel";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

type ReceptionStudentsPageProps = {
  searchParams: Promise<{
    gradeClassId?: string;
    studentId?: string;
    studentSearch?: string;
  }>;
};

export default async function ReceptionStudentsPage({
  searchParams,
}: ReceptionStudentsPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "RECEPTION" && currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const query = await searchParams;
  const studentSearch = query.studentSearch?.trim() || undefined;
  const students = await prisma.student.findMany({
    orderBy: { fullName: "asc" },
    where: {
      isActive: true,
      ...(studentSearch
        ? { fullName: { contains: studentSearch, mode: "insensitive" } }
        : {}),
    },
    take: 60,
    select: { id: true, fullName: true },
  });
  const selectedStudentId =
    query.studentId ??
    (studentSearch
      ? students.find(
          (student) =>
            student.fullName.toLocaleLowerCase() ===
            studentSearch.toLocaleLowerCase(),
        )?.id
      : undefined);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <strong>Class Records Platform</strong>
            <span>{currentUser.name}</span>
          </div>
          <form action={logoutAction}>
            <button className="secondary-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="main data-page">
        <section className="intro" aria-labelledby="students-title">
          <Link className="text-link" href="/reception">
            Back to reception
          </Link>
          <p className="eyebrow">Reception</p>
          <h1 id="students-title">Students</h1>
          <p className="lede">
            Search active students and review class, attendance, and grade details.
          </p>
          {currentUser.role === "ADMIN" ? (
            <div className="action-row">
              <Link className="secondary-link" href="/dashboard">
                Back to dashboard
              </Link>
            </div>
          ) : null}
        </section>

        <section className="panel" aria-label="Student filters">
          <form className="filter-form compact-filter-form">
            <label>
              <span>Student search</span>
              <input
                defaultValue={studentSearch ?? ""}
                list="reception-students"
                name="studentSearch"
                placeholder="Type a student name"
                type="search"
              />
              <datalist id="reception-students">
                {students.map((student) => (
                  <option key={student.id} value={student.fullName} />
                ))}
              </datalist>
            </label>
            <div className="filter-actions">
              <button className="primary-button" type="submit">
                Search
              </button>
              <Link className="text-link" href="/reception/students">
                Clear
              </Link>
            </div>
          </form>
        </section>

        {studentSearch && students.length > 0 ? (
          <section className="panel data-panel" aria-label="Student results">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>{student.fullName}</td>
                      <td>
                        <Link
                          className="text-link compact-link"
                          href={`/reception/students?studentId=${student.id}`}
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {selectedStudentId ? (
          <StudentProfilePanel
            basePath="/reception/students"
            selectedClassId={query.gradeClassId}
            studentId={selectedStudentId}
          />
        ) : null}
      </div>
    </main>
  );
}
