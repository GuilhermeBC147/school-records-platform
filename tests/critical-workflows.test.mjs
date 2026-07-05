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
  assert.match(dashboard, /Teacher workflows/);
  assert.match(dashboard, /teacher-class-card/);
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

test("account management supports reset tokens and admin staff setup", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const accountsPage = await readProjectFile(
    "src/app/admin/manage-accounts/page.tsx",
  );
  const newAccountPage = await readProjectFile(
    "src/app/admin/manage-accounts/new/page.tsx",
  );

  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(accountActions, /requestPasswordResetAction/);
  assert.match(accountActions, /resetPasswordAction/);
  assert.match(accountActions, /createAccountAction/);
  assert.match(accountActions, /updateAccountAction/);
  assert.match(accountActions, /role !== "TEACHER" && role !== "RECEPTION"/);
  assert.match(accountActions, /isActive/);
  assert.match(accountsPage, /Manage accounts/);
  assert.match(accountsPage, /formatAccountRole/);
  assert.match(newAccountPage, /Create account/);
  assert.match(newAccountPage, /value="RECEPTION"/);
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
  assert.match(classesPage, /classStatus/);
  assert.doesNotMatch(classesPage, /Active and inactive/);
  assert.match(classesPage, /teacherId/);
  assert.match(classesPage, /weekDay/);
  assert.match(classesPage, /hasSome/);
  assert.match(classesPage, /Search enrolled students/);
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
  const viewStudentPage = await readProjectFile(
    "src/app/admin/students/[studentId]/view/page.tsx",
  );
  const studentProfilePanel = await readProjectFile(
    "src/app/components/student-profile-panel.tsx",
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
  assert.match(studentsPage, /studentSearch/);
  assert.match(studentsPage, /datalist id="admin-students"/);
  assert.match(studentsPage, /\/admin\/students\/\$\{student\.id\}\/view/);
  assert.match(newStudentPage, /createStudentAction/);
  assert.match(editStudentPage, /updateStudentAction/);
  assert.match(viewStudentPage, /StudentProfilePanel/);
  assert.match(studentProfilePanel, /Current active class/);
  assert.match(studentProfilePanel, /Last class lesson/);
  assert.match(studentProfilePanel, /absentLessons/);
  assert.match(studentProfilePanel, /gradeClassId/);
  assert.match(recordForm, /student:\s*{\s*isActive: true/s);
  assert.match(dashboardPage, /Manage students/);
  assert.match(dashboardPage, /dashboard-metric-grid/);
  assert.match(dashboardPage, /dashboard-action-grid/);
  assert.match(dashboardPage, /Review substitutions/);
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
  assert.match(riskPage, /incompleteHomework:\s*4/);
  assert.match(riskPage, /lowTestTotalScore:\s*7/);
  assert.match(riskPage, /lowOralGradeMaximum:\s*"C"/);
  assert.match(riskPage, /missedClasses:\s*4/);
  assert.match(riskPage, /consecutiveMissedClasses:\s*2/);
  assert.match(riskPage, /status: "SUBMITTED"/);
  assert.match(riskPage, /attendanceRecord\.status === "ABSENT"/);
  assert.match(riskPage, /homeworkStatus === "INCOMPLETE"/);
  assert.match(riskPage, /compositionScore/);
  assert.match(riskPage, /writtenTestScore/);
  assert.match(riskPage, /testTotal < RISK_THRESHOLDS\.lowTestTotalScore/);
  assert.match(riskPage, /lowOralGrades/);
  assert.match(riskPage, /consecutiveMissedClassCount/);
  assert.match(riskPage, /longestMissedStreak/);
  assert.match(riskPage, /\$queryRaw<RiskResolution\[\]>/);
  assert.match(riskPage, /resolveRiskRecordAction/);
  assert.match(riskPage, /undoRiskResolutionAction/);
  assert.match(riskPage, /resolutionStatus/);
  assert.match(riskPage, /teacherId/);
  assert.match(riskPage, /classId/);
  assert.match(riskPage, /dateFrom/);
  assert.match(riskPage, /dateTo/);
  assert.match(riskPage, /\/admin\/students\/\$\{record\.studentId\}/);
  assert.match(riskPage, /\/admin\/records\/\$\{record\.recentLessonId\}/);
  assert.match(riskPage, /Resolve/);
  assert.match(riskPage, /Undo resolve/);
  assert.match(dashboardPage, /\/admin\/risk/);
  assert.match(dataModelDoc, /mark a student\/class risk row as resolved/);
  assert.match(dataModelDoc, /Risk Review/);
});

test("teacher work summaries count lessons and paid activity logs", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const workLib = await readProjectFile("src/lib/teacher-work.ts");
  const workActions = await readProjectFile("src/app/actions/teacher-work.ts");
  const teacherWorkPage = await readProjectFile("src/app/dashboard/work/page.tsx");
  const newActivityPage = await readProjectFile(
    "src/app/dashboard/work/new/page.tsx",
  );
  const adminWorkPage = await readProjectFile("src/app/admin/work-summary/page.tsx");
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");
  const dataModelDoc = await readProjectFile("docs/data-model.md");
  const migration = await readProjectFile(
    "prisma/migrations/20260704140000_add_teacher_work_logs/migration.sql",
  );

  assert.match(schema, /enum TeacherWorkCategory/);
  assert.match(schema, /BONUS_CLASS/);
  assert.match(schema, /EXTRA_ACTIVITY/);
  assert.doesNotMatch(schema, /GAME_NIGHT/);
  assert.match(schema, /model TeacherWorkLog/);
  assert.match(schema, /subject\s+String\?/);
  assert.match(schema, /teacherId\s+String/);
  assert.match(schema, /createdById\s+String/);
  assert.match(schema, /@@index\(\[teacherId, workDate\]\)/);
  assert.match(migration, /TeacherWorkLog_durationMinutes_check/);
  assert.match(workLib, /getTeacherWorkSummary/);
  assert.match(workLib, /status: "SUBMITTED"/);
  assert.match(workLib, /durationMinutes/);
  assert.match(workActions, /createTeacherWorkLogAction/);
  assert.match(workActions, /createTeacherMeetingAction/);
  assert.match(workActions, /category === "BONUS_CLASS" && !subject/);
  assert.match(workActions, /currentUser\.role === "ADMIN"/);
  assert.match(workActions, /role: "TEACHER"/);
  assert.match(workActions, /teacherWorkLog\.create/);
  assert.match(teacherWorkPage, /Monthly summary/);
  assert.match(teacherWorkPage, /\/dashboard\/work\/new/);
  assert.doesNotMatch(teacherWorkPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /Add event/);
  assert.match(newActivityPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /name="subject"/);
  assert.match(newActivityPage, /teacherWorkCategories/);
  assert.match(newActivityPage, /category\.value !== "MEETING"/);
  assert.match(teacherWorkPage, /Submitted class lessons count automatically/);
  assert.match(adminWorkPage, /Teacher work summaries/);
  assert.match(adminWorkPage, /getTeacherWorkSummary/);
  assert.match(adminWorkPage, /createTeacherMeetingAction/);
  assert.match(adminWorkPage, /All teachers/);
  assert.match(dashboardPage, /\/dashboard\/work/);
  assert.match(dashboardPage, /\/dashboard\/work\/new/);
  assert.match(dashboardPage, /\/admin\/work-summary/);
  assert.match(dataModelDoc, /Teacher Work Summaries/);
  assert.match(dataModelDoc, /class's assigned teacher/);
});

test("substitute teachers can submit lessons pending admin approval", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const recordActions = await readProjectFile("src/app/actions/class-records.ts");
  const substitutionActions = await readProjectFile(
    "src/app/actions/substitutions.ts",
  );
  const recordPage = await readProjectFile(
    "src/app/dashboard/classes/[classId]/record/page.tsx",
  );
  const substitutionPage = await readProjectFile(
    "src/app/dashboard/substitutions/new/page.tsx",
  );
  const adminSubstitutionsPage = await readProjectFile(
    "src/app/admin/substitutions/page.tsx",
  );
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");
  const workLib = await readProjectFile("src/lib/teacher-work.ts");
  const dataModelDoc = await readProjectFile("docs/data-model.md");
  const migration = await readProjectFile(
    "prisma/migrations/20260704150000_add_substitute_lesson_approval/migration.sql",
  );

  assert.match(schema, /enum SubstitutionStatus/);
  assert.match(schema, /PENDING_APPROVAL/);
  assert.match(schema, /APPROVED/);
  assert.match(schema, /taughtById\s+String\?/);
  assert.match(schema, /substitutionReviewedById\s+String\?/);
  assert.match(migration, /CREATE TYPE "SubstitutionStatus"/);
  assert.match(migration, /SET "taughtById" = "Class"\."teacherId"/);
  assert.match(recordActions, /isSubstituteRecord/);
  assert.match(recordActions, /PENDING_APPROVAL/);
  assert.match(recordActions, /taughtById: currentUser\.id/);
  assert.match(recordActions, /\/dashboard\/work\?status=substitution-pending/);
  assert.match(recordPage, /substitute === "1"/);
  assert.match(recordPage, /Substitute class record/);
  assert.match(recordPage, /Submit substitute record/);
  assert.match(recordPage, /substitutionNotes/);
  assert.match(substitutionPage, /Substitute lesson/);
  assert.match(substitutionPage, /not: currentUser\.id/);
  assert.match(substitutionPage, /substitute=1/);
  assert.match(substitutionActions, /approveSubstitutionAction/);
  assert.match(substitutionActions, /rejectSubstitutionAction/);
  assert.match(substitutionActions, /undoSubstitutionApprovalAction/);
  assert.match(substitutionActions, /substitutionReviewedById/);
  assert.match(adminSubstitutionsPage, /approveSubstitutionAction/);
  assert.match(adminSubstitutionsPage, /rejectSubstitutionAction/);
  assert.match(adminSubstitutionsPage, /Undo approval/);
  assert.match(dashboardPage, /\/dashboard\/substitutions\/new/);
  assert.match(dashboardPage, /\/admin\/substitutions/);
  assert.match(workLib, /substitutionStatus: "APPROVED"/);
  assert.match(workLib, /pendingSubstituteLessons/);
  assert.match(dataModelDoc, /Substitute Lessons/);
  assert.match(dataModelDoc, /Approval affects payroll attribution only/);
});

test("reception can schedule bonus classes for teacher confirmation", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const seed = await readProjectFile("prisma/seed.sql");
  const bonusActions = await readProjectFile("src/app/actions/bonus-classes.ts");
  const bonusLib = await readProjectFile("src/lib/bonus-classes.ts");
  const receptionDashboardPage = await readProjectFile("src/app/reception/page.tsx");
  const receptionPage = await readProjectFile(
    "src/app/reception/bonus-classes/page.tsx",
  );
  const receptionCalendarPage = await readProjectFile(
    "src/app/reception/calendar/page.tsx",
  );
  const receptionStudentsPage = await readProjectFile(
    "src/app/reception/students/page.tsx",
  );
  const receptionClassesPage = await readProjectFile(
    "src/app/reception/classes/page.tsx",
  );
  const receptionCombinedRedirectPage = await readProjectFile(
    "src/app/reception/students-and-classes/page.tsx",
  );
  const studentProfilePanel = await readProjectFile(
    "src/app/components/student-profile-panel.tsx",
  );
  const receptionEditPage = await readProjectFile(
    "src/app/reception/bonus-classes/[bonusClassId]/page.tsx",
  );
  const globalStyles = await readProjectFile("src/app/globals.css");
  const teacherBonusPage = await readProjectFile(
    "src/app/dashboard/bonus-classes/page.tsx",
  );
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");
  const workLib = await readProjectFile("src/lib/teacher-work.ts");
  const dataModelDoc = await readProjectFile("docs/data-model.md");
  const migration = await readProjectFile(
    "prisma/migrations/20260704160000_add_bonus_class_scheduling/migration.sql",
  );
  const attendanceMigration = await readProjectFile(
    "prisma/migrations/20260704163000_add_bonus_class_attendance/migration.sql",
  );

  assert.match(schema, /RECEPTION/);
  assert.match(schema, /enum BonusClassStatus/);
  assert.match(schema, /enum BonusClassAttendanceStatus/);
  assert.match(schema, /model BonusClass/);
  assert.match(schema, /attendanceStatus\s+BonusClassAttendanceStatus/);
  assert.match(schema, /subject\s+String/);
  assert.match(schema, /@@index\(\[teacherId, scheduledDate\]\)/);
  assert.match(seed, /reception@example\.com/);
  assert.match(migration, /ALTER TYPE "UserRole" ADD VALUE/);
  assert.match(migration, /CREATE TABLE "BonusClass"/);
  assert.match(migration, /BonusClass_durationMinutes_check/);
  assert.match(attendanceMigration, /CREATE TYPE "BonusClassAttendanceStatus"/);
  assert.match(attendanceMigration, /attendanceConfirmedById/);
  assert.match(bonusActions, /requireReceptionOrAdmin/);
  assert.match(bonusActions, /createBonusClassAction/);
  assert.match(bonusActions, /updateBonusClassAction/);
  assert.match(bonusActions, /cancelBonusClassAction/);
  assert.match(bonusActions, /completeBonusClassAction/);
  assert.match(bonusActions, /readAttendanceStatus/);
  assert.match(bonusActions, /hasTeacherBonusClassOverlap/);
  assert.match(bonusLib, /formatBonusClassResultMessage/);
  assert.match(bonusLib, /formatBonusClassErrorMessage/);
  assert.match(bonusLib, /startMinutes < existingEnd/);
  assert.match(receptionDashboardPage, /\/reception\/calendar/);
  assert.match(receptionDashboardPage, /\/reception\/students/);
  assert.match(receptionDashboardPage, /\/reception\/classes/);
  assert.match(receptionDashboardPage, /dashboard-metric-grid/);
  assert.match(receptionDashboardPage, /dashboard-action-grid/);
  assert.match(receptionDashboardPage, /upcomingBonusClasses/);
  assert.match(receptionPage, /Schedule bonus class/);
  assert.match(receptionPage, /studentSearch/);
  assert.doesNotMatch(receptionPage, /Bonus class \{query\.status\}/);
  assert.match(receptionPage, /formatBonusClassResultMessage/);
  assert.match(receptionPage, /formatBonusClassErrorMessage/);
  assert.match(receptionCalendarPage, /Daily teacher calendar/);
  assert.match(receptionCalendarPage, /timeSlots/);
  assert.match(receptionCalendarPage, /formatTimeFromMinutes/);
  assert.match(receptionPage, /\/reception\/bonus-classes\/\$\{bonusClass\.id\}/);
  assert.match(receptionCombinedRedirectPage, /redirect\("\/reception\/students"\)/);
  assert.match(receptionStudentsPage, /Students/);
  assert.match(receptionStudentsPage, /studentSearch/);
  assert.match(receptionStudentsPage, /datalist id="reception-students"/);
  assert.doesNotMatch(receptionStudentsPage, /name="studentId">\s*<option value="">Choose a student/s);
  assert.match(receptionStudentsPage, /StudentProfilePanel/);
  assert.match(receptionStudentsPage, /studentId=\$\{student\.id\}/);
  assert.match(studentProfilePanel, /absentLessons/);
  assert.match(studentProfilePanel, /gradeClassId/);
  assert.match(studentProfilePanel, /student-profile-summary/);
  assert.match(studentProfilePanel, /student-grade-cards/);
  assert.match(receptionClassesPage, /Classes/);
  assert.match(receptionClassesPage, /datalist id="reception-classes"/);
  assert.match(receptionClassesPage, /teacherId/);
  assert.match(receptionClassesPage, /weekDay/);
  assert.match(receptionClassesPage, /hasSome/);
  assert.match(receptionClassesPage, /checkbox-label/);
  assert.doesNotMatch(receptionClassesPage, /Choose a class/);
  assert.match(receptionClassesPage, /Recent lessons/);
  assert.match(receptionClassesPage, /Untitled lesson/);
  assert.match(receptionEditPage, /updateBonusClassAction/);
  assert.match(receptionEditPage, /completeBonusClassAction/);
  assert.match(receptionEditPage, /status\?: string/);
  assert.match(receptionEditPage, /formatBonusClassResultMessage/);
  assert.match(teacherBonusPage, /attendanceStatus/);
  assert.match(teacherBonusPage, /bonus-calendar/);
  assert.match(teacherBonusPage, /dateFrom/);
  assert.match(teacherBonusPage, /formatBonusClassResultMessage/);
  assert.match(globalStyles, /schedule-table/);
  assert.match(dashboardPage, /currentUser\.role === "RECEPTION"/);
  assert.match(dashboardPage, /Admin dashboard/);
  assert.match(dashboardPage, /\/reception/);
  assert.match(dashboardPage, /\/dashboard\/bonus-classes/);
  assert.match(workLib, /bonusClasses/);
  assert.match(workLib, /status: "COMPLETED"/);
  assert.match(dataModelDoc, /Reception accounts can schedule independent bonus classes/);
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
