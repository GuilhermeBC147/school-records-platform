import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readProjectFile(path) {
  return readFile(new URL(path, root), "utf8");
}

test("teacher class pages restrict class access to assigned teachers", async () => {
  const dashboard = await readProjectFile("src/app/dashboard/page.tsx");
  const classDetail = await readProjectFile(
    "src/app/dashboard/classes/[classId]/page.tsx",
  );
  const recordForm = await readProjectFile(
    "src/app/dashboard/classes/[classId]/record/page.tsx",
  );

  assert.match(dashboard, /currentUser\.role === "TEACHER"/);
  assert.match(dashboard, /teacherId: currentUser\.id/);
  assert.match(classDetail, /currentUser\.role === "TEACHER"/);
  assert.match(classDetail, /teacherId: currentUser\.id/);
  assert.match(recordForm, /currentUser\.role === "TEACHER"/);
  assert.match(recordForm, /teacherId: currentUser\.id/);
});

test("class record submission protects duplicate and unauthorized writes", async () => {
  const action = await readProjectFile("src/app/actions/class-records.ts");

  assert.match(action, /getCurrentUser/);
  assert.match(action, /redirect\("\/login"\)/);
  assert.match(action, /teacherId: currentUser\.id/);
  assert.match(action, /lessonName/);
  assert.doesNotMatch(action, /lessonTime/);
  assert.match(action, /status === "SUBMITTED"/);
  assert.match(action, /existingLesson\?\.status === "SUBMITTED"/);
  assert.match(action, /prisma\.\$transaction/);
});

test("admin records and export routes require admin sessions", async () => {
  const listPage = await readProjectFile("src/app/admin/records/page.tsx");
  const detailPage = await readProjectFile(
    "src/app/admin/records/[lessonId]/page.tsx",
  );
  const exportRoute = await readProjectFile(
    "src/app/admin/records/export/route.ts",
  );

  for (const source of [listPage, detailPage, exportRoute]) {
    assert.match(source, /getCurrentUser/);
    assert.match(source, /currentUser\.role !== "ADMIN"/);
  }
});

test("account management supports reset tokens and admin teacher setup", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const teachersPage = await readProjectFile("src/app/admin/teachers/page.tsx");

  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(accountActions, /requestPasswordResetAction/);
  assert.match(accountActions, /resetPasswordAction/);
  assert.match(accountActions, /createTeacherAction/);
  assert.match(accountActions, /updateTeacherAction/);
  assert.match(accountActions, /role: "TEACHER"/);
  assert.match(accountActions, /isActive/);
  assert.match(teachersPage, /Create teacher/);
});

test("class management supports metadata and active teacher assignment", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const classActions = await readProjectFile("src/app/actions/classes.ts");
  const classesPage = await readProjectFile("src/app/admin/classes/page.tsx");
  const newClassPage = await readProjectFile("src/app/admin/classes/new/page.tsx");
  const rosterPicker = await readProjectFile(
    "src/app/admin/classes/roster-picker.tsx",
  );
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");

  assert.match(schema, /book\s+String\?/);
  assert.match(schema, /semester\s+Int\?/);
  assert.match(schema, /year\s+Int\?/);
  assert.match(classActions, /createClassAction/);
  assert.match(classActions, /updateClassAction/);
  assert.match(classActions, /updateClassRosterAction/);
  assert.match(classActions, /studentIds/);
  assert.match(classActions, /role: "TEACHER"/);
  assert.match(classActions, /isActive: true/);
  assert.match(classesPage, /Create class/);
  assert.match(classesPage, /Semester/);
  assert.match(newClassPage, /Class roster/);
  assert.match(newClassPage, /RosterPicker/);
  assert.match(rosterPicker, /Search students/);
  assert.match(rosterPicker, /name="studentIds"/);
  assert.match(dashboardPage, /currentUser\.role === "TEACHER"/);
  assert.match(dashboardPage, /isActive: true/);
});

test("admin student management supports creating and editing students", async () => {
  const studentActions = await readProjectFile("src/app/actions/students.ts");
  const studentsPage = await readProjectFile("src/app/admin/students/page.tsx");
  const newStudentPage = await readProjectFile("src/app/admin/students/new/page.tsx");
  const editStudentPage = await readProjectFile(
    "src/app/admin/students/[studentId]/page.tsx",
  );
  const recordForm = await readProjectFile(
    "src/app/dashboard/classes/[classId]/record/page.tsx",
  );
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");

  assert.match(studentActions, /createStudentAction/);
  assert.match(studentActions, /updateStudentAction/);
  assert.match(studentActions, /currentUser\.role !== "ADMIN"/);
  assert.match(studentActions, /fullName/);
  assert.doesNotMatch(studentActions, /preferredName/);
  assert.match(studentActions, /isActive/);
  assert.match(studentsPage, /Create student/);
  assert.match(newStudentPage, /createStudentAction/);
  assert.match(editStudentPage, /updateStudentAction/);
  assert.match(recordForm, /student:\s*{\s*isActive: true/s);
  assert.match(dashboardPage, /Manage students/);
});

test("admin CSV export includes record filters and student rows", async () => {
  const exportRoute = await readProjectFile(
    "src/app/admin/records/export/route.ts",
  );

  assert.match(exportRoute, /classId/);
  assert.match(exportRoute, /teacherId/);
  assert.match(exportRoute, /studentId/);
  assert.match(exportRoute, /readFilterDate/);
  assert.match(exportRoute, /text\/csv/);
  assert.match(exportRoute, /lesson_name/);
  assert.match(exportRoute, /attendance/);
  assert.match(exportRoute, /homework/);
});

test("production handoff documents deployment, backups, and smoke tests", async () => {
  const productionDoc = await readProjectFile("docs/production-readiness.md");
  const backupDoc = await readProjectFile("docs/backup-export.md");

  assert.match(productionDoc, /DATABASE_URL/);
  assert.match(productionDoc, /AUTH_SECRET/);
  assert.match(productionDoc, /prisma migrate deploy/);
  assert.match(productionDoc, /automated backups/);
  assert.match(productionDoc, /Release Smoke Test/);
  assert.match(backupDoc, /Export CSV/);
});
