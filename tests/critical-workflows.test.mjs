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

test("grading model supports partial evaluations and test grades", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const dataModelDoc = await readProjectFile("docs/data-model.md");
  const migration = await readProjectFile(
    "prisma/migrations/20260704001000_add_grading_model/migration.sql",
  );

  assert.match(schema, /enum LetterGrade/);
  assert.match(schema, /D_MINUS/);
  assert.match(schema, /A_MINUS/);
  assert.match(schema, /enum PartialEvaluationPeriod/);
  assert.match(schema, /CLASS_7/);
  assert.match(schema, /CLASS_23/);
  assert.match(schema, /enum TestPeriod/);
  assert.match(schema, /MID_TERM/);
  assert.match(schema, /FINAL/);
  assert.match(schema, /model PartialEvaluationGrade/);
  assert.match(schema, /@@unique\(\[classId, studentId, period\]\)/);
  assert.match(schema, /model TestGrade/);
  assert.match(schema, /compositionScore\s+Decimal\s+@db\.Decimal\(4, 2\)/);
  assert.match(schema, /writtenTestScore\s+Decimal\s+@db\.Decimal\(4, 2\)/);
  assert.match(migration, /compositionScore_range/);
  assert.match(migration, /writtenTestScore_range/);
  assert.match(dataModelDoc, /there is no `A\+`/);
  assert.match(dataModelDoc, /composition plus written test/);
});

test("teacher grade entry validates values and class access", async () => {
  const gradeActions = await readProjectFile("src/app/actions/grades.ts");
  const classDetail = await readProjectFile(
    "src/app/dashboard/classes/[classId]/page.tsx",
  );

  assert.match(gradeActions, /updateClassGradesAction/);
  assert.match(gradeActions, /getCurrentUser/);
  assert.match(gradeActions, /redirect\("\/login"\)/);
  assert.match(gradeActions, /teacherId: currentUser\.id/);
  assert.match(gradeActions, /partialEvaluationPeriods/);
  assert.match(gradeActions, /testPeriods/);
  assert.match(gradeActions, /readScore/);
  assert.match(gradeActions, /maxScore/);
  assert.match(gradeActions, /prisma\.\$transaction/);
  assert.match(gradeActions, /partialEvaluationGrade\.upsert/);
  assert.match(gradeActions, /testGrade\.upsert/);
  assert.match(classDetail, /updateClassGradesAction/);
  assert.match(classDetail, /Save grades/);
  assert.match(classDetail, /partialEvaluationGrades/);
  assert.match(classDetail, /testGrades/);
  assert.match(classDetail, /composition/);
  assert.match(classDetail, /written/);
});

test("logged-in account page supports changing own password", async () => {
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const accountPage = await readProjectFile("src/app/dashboard/account/page.tsx");
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");

  assert.match(accountActions, /changeOwnPasswordAction/);
  assert.match(accountActions, /getCurrentUser/);
  assert.match(accountActions, /redirect\("\/login"\)/);
  assert.match(accountActions, /verifyPassword\(currentPassword/);
  assert.match(accountActions, /hashPassword\(newPassword\)/);
  assert.match(accountPage, /changeOwnPasswordAction/);
  assert.match(accountPage, /currentPassword/);
  assert.match(accountPage, /newPassword/);
  assert.match(accountPage, /confirmPassword/);
  assert.match(dashboardPage, /currentUser\.role === "ADMIN"/);
  assert.match(dashboardPage, /\/dashboard\/account/);
});

test("admin risk review flags attendance and homework signals", async () => {
  const riskPage = await readProjectFile("src/app/admin/risk/page.tsx");
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");
  const dataModelDoc = await readProjectFile("docs/data-model.md");

  assert.match(riskPage, /RISK_THRESHOLDS/);
  assert.match(riskPage, /incompleteHomework:\s*3/);
  assert.match(riskPage, /missedClasses:\s*3/);
  assert.match(riskPage, /consecutiveMissedClasses:\s*2/);
  assert.match(riskPage, /status: "SUBMITTED"/);
  assert.match(riskPage, /attendanceRecord\.status === "ABSENT"/);
  assert.match(riskPage, /homeworkStatus === "INCOMPLETE"/);
  assert.match(riskPage, /missedStreak >= RISK_THRESHOLDS\.consecutiveMissedClasses/);
  assert.match(riskPage, /teacherId/);
  assert.match(riskPage, /classId/);
  assert.match(riskPage, /dateFrom/);
  assert.match(riskPage, /dateTo/);
  assert.match(riskPage, /\/admin\/students\/\$\{record\.studentId\}/);
  assert.match(riskPage, /\/admin\/records\/\$\{record\.recentLessonId\}/);
  assert.match(dashboardPage, /\/admin\/risk/);
  assert.match(dataModelDoc, /Risk Review/);
});

test("production handoff documents deployment, backups, and smoke tests", async () => {
  const productionDoc = await readProjectFile("docs/production-readiness.md");
  const backupDoc = await readProjectFile("docs/backup-export.md");

  assert.match(productionDoc, /DATABASE_URL/);
  assert.match(productionDoc, /AUTH_SECRET/);
  assert.match(productionDoc, /prisma migrate deploy/);
  assert.match(productionDoc, /automated backups/);
  assert.match(productionDoc, /grades and risk-review data/);
  assert.match(productionDoc, /\/admin\/risk/);
  assert.match(productionDoc, /Release Smoke Test/);
  assert.match(backupDoc, /Export CSV/);
  assert.match(backupDoc, /student full name/);
  assert.match(backupDoc, /Grades and Risk Review Backups/);
  assert.match(backupDoc, /partial evaluation grades/);
  assert.match(backupDoc, /\/admin\/risk/);
  assert.doesNotMatch(backupDoc, /preferred name/);
});
