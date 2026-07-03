import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateClassAction } from "@/app/actions/classes";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type EditClassPageProps = {
  params: Promise<{
    classId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function EditClassPage({
  params,
  searchParams,
}: EditClassPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  if (currentUser.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const { classId } = await params;
  const [query, schoolClass, teachers] = await Promise.all([
    searchParams,
    prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        level: true,
        book: true,
        semester: true,
        year: true,
        isActive: true,
        teacherId: true,
      },
    }),
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
  ]);

  if (!schoolClass) {
    notFound();
  }

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
        <section className="intro" aria-labelledby="edit-class-title">
          <Link className="text-link" href="/admin/classes">
            Back to classes
          </Link>
          <p className="eyebrow">Admin setup</p>
          <h1 id="edit-class-title">Edit class</h1>
        </section>

        <section className="panel">
          {query.error === "invalid" ? (
            <p className="form-error">
              Enter a class name, active teacher, and valid semester/year.
            </p>
          ) : null}
          <form action={updateClassAction} className="admin-form">
            <input name="classId" type="hidden" value={schoolClass.id} />
            <label>
              <span>Name</span>
              <input defaultValue={schoolClass.name} name="name" required type="text" />
            </label>
            <label>
              <span>Level</span>
              <input defaultValue={schoolClass.level ?? ""} name="level" type="text" />
            </label>
            <label>
              <span>Book</span>
              <input
                defaultValue={schoolClass.book ?? ""}
                list="book-options"
                name="book"
                type="text"
              />
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
              <select defaultValue={schoolClass.semester ?? ""} name="semester">
                <option value="">No semester</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </label>
            <label>
              <span>Year</span>
              <input
                defaultValue={schoolClass.year ?? ""}
                max="2100"
                min="2000"
                name="year"
                type="number"
              />
            </label>
            <label>
              <span>Teacher</span>
              <select defaultValue={schoolClass.teacherId} name="teacherId" required>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                defaultChecked={schoolClass.isActive}
                name="isActive"
                type="checkbox"
              />
              <span>Active class</span>
            </label>
            <div className="record-actions">
              <Link className="text-link" href="/admin/classes">
                Cancel
              </Link>
              <button className="primary-button" type="submit">
                Save class
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
