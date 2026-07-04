import Link from "next/link";
import { redirect } from "next/navigation";
import { createClassAction } from "@/app/actions/classes";
import { logoutAction } from "@/app/actions/auth";
import { RosterPicker } from "@/app/admin/classes/roster-picker";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type NewClassPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewClassPage({ searchParams }: NewClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [params, teachers, students] = await Promise.all([
    searchParams,
    prisma.user.findMany({
      where: {
        role: "TEACHER",
        isActive: true,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
      },
    }),
  ]);

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
        <section className="intro" aria-labelledby="new-class-title">
          <Link className="text-link" href="/admin/classes">
            Back to classes
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="new-class-title">Create class</h1>
        </section>

        <section className="panel">
          {params.error === "invalid" ? (
            <p className="form-error">
              Enter a class name, active teacher, and valid semester/year.
            </p>
          ) : null}
          <form action={createClassAction} className="admin-form">
            <label>
              <span>Name</span>
              <input name="name" placeholder="Evening English A2" required type="text" />
            </label>
            <label>
              <span>Book</span>
              <input list="book-options" name="book" placeholder="Book 1" type="text" />
            </label>
            <datalist id="book-options">
              <option value="Book 1" />
              <option value="Book 2" />
              <option value="Book 3" />
              <option value="Junior 1" />
              <option value="Junior 2" />
              <option value="Junior 3" />
            </datalist>
            <label>
              <span>Semester</span>
              <select name="semester">
                <option value="">No semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <input name="year" placeholder="2026" type="number" min="2000" max="2100" />
            </label>
            <label>
              <span>Teacher</span>
              <select name="teacherId" required>
                <option value="">Choose a teacher</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input defaultChecked name="isActive" type="checkbox" />
              <span>Active class</span>
            </label>
            <div>
              <span className="form-section-label">Class roster</span>
              <RosterPicker
                emptyMessage="No active students yet. Create students before assigning the roster."
                students={students.map((student) => ({
                  ...student,
                  isActive: true,
                }))}
              />
            </div>
            <div className="record-actions">
              <Link className="text-link" href="/admin/classes">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Create class
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
