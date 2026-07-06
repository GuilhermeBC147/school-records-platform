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
  assert.match(
    classDetail,
    /currentUser\.role !== "ADMIN" && currentUser\.role !== "TEACHER"/,
  );
  assert.match(classDetail, /teacherId: currentUser\.id/);
  assert.match(recordForm, /currentUser\.role === "TEACHER"/);
  assert.match(
    recordForm,
    /currentUser\.role !== "ADMIN" && currentUser\.role !== "TEACHER"/,
  );
  assert.match(recordForm, /teacherId: currentUser\.id/);
});

test("class record submission protects duplicate and unauthorized writes", async () => {
  const action = await readProjectFile("src/app/actions/class-records.ts");

  assert.match(action, /getCurrentUser/);
  assert.match(action, /readIsoDate/);
  assert.match(action, /redirect\("\/login"\)/);
  assert.match(
    action,
    /currentUser\.role !== "ADMIN" && currentUser\.role !== "TEACHER"/,
  );
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
  const dateFormat = await readProjectFile("src/lib/date-format.ts");

  for (const source of [listPage, detailPage, exportRoute]) {
    assert.match(source, /getCurrentUser/);
    assert.match(source, /currentUser\.role !== "ADMIN"/);
  }
  assert.match(dateFormat, /hour12:\s*false/);
  assert.match(dateFormat, /hourCycle:\s*"h23"/);
});

test("account management supports reset tokens and admin staff setup", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const messages = await readProjectFile("src/lib/messages.ts");
  const accountsPage = await readProjectFile(
    "src/app/admin/manage-accounts/page.tsx",
  );
  const accountPage = await readProjectFile("src/app/dashboard/account/page.tsx");
  const newAccountPage = await readProjectFile(
    "src/app/admin/manage-accounts/new/page.tsx",
  );

  assert.match(schema, /enum AccountDateFormat/);
  assert.match(schema, /dateFormat\s+AccountDateFormat\s+@default\(DD_MM_YY\)/);
  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(accountActions, /requestPasswordResetAction/);
  assert.match(accountActions, /resetPasswordAction/);
  assert.match(accountActions, /updateOwnDateFormatAction/);
  assert.match(accountActions, /normalizeAccountDateFormat/);
  assert.match(accountActions, /createAccountAction/);
  assert.match(accountActions, /updateAccountAction/);
  assert.match(accountActions, /role !== "TEACHER" && role !== "RECEPTION"/);
  assert.match(accountActions, /isActive/);
  assert.match(messages, /formatEntityResultMessage/);
  assert.match(messages, /status !== "created" && status !== "updated"/);
  assert.match(messages, /formatTeacherWorkErrorMessage/);
  assert.match(accountPage, /accountDateFormatOptions/);
  assert.match(accountPage, /name="dateFormat"/);
  assert.match(accountsPage, /Manage accounts/);
  assert.match(accountsPage, /formatAccountRole/);
  assert.match(accountsPage, /formatEntityResultMessage\("Account", params\.status\)/);
  assert.match(accountsPage, /No staff accounts have been created yet\./);
  assert.match(newAccountPage, /Create account/);
  assert.match(newAccountPage, /value="RECEPTION"/);
});

test("date filters display account format while submitting ISO dates", async () => {
  const dateFormat = await readProjectFile("src/lib/date-format.ts");
  const dateInput = await readProjectFile("src/app/components/date-input.tsx");
  const prismaClient = await readProjectFile("src/lib/prisma.ts");
  const session = await readProjectFile("src/lib/session.ts");
  const adminRecordsPage = await readProjectFile("src/app/admin/records/page.tsx");
  const classRecordPage = await readProjectFile(
    "src/app/dashboard/classes/[classId]/record/page.tsx",
  );
  const newActivityPage = await readProjectFile(
    "src/app/dashboard/work/new/page.tsx",
  );
  const riskPage = await readProjectFile("src/app/admin/risk/page.tsx");
  const teacherBonusPage = await readProjectFile(
    "src/app/dashboard/bonus-classes/page.tsx",
  );
  const receptionBonusPage = await readProjectFile(
    "src/app/reception/bonus-classes/page.tsx",
  );
  const receptionEditPage = await readProjectFile(
    "src/app/reception/bonus-classes/[bonusClassId]/page.tsx",
  );
  const receptionCalendarPage = await readProjectFile(
    "src/app/reception/calendar/page.tsx",
  );

  assert.match(session, /dateFormat: true/);
  assert.match(prismaClient, /add_account_date_format_client_refresh/);
  assert.match(dateFormat, /parseDateInputToIso/);
  assert.match(dateFormat, /formatIsoDateInput/);
  assert.match(dateInput, /"use client"/);
  assert.match(dateInput, /type="text"/);
  assert.match(dateInput, /type="hidden"/);
  assert.match(dateInput, /type="date"/);
  assert.match(dateInput, /date-calendar-input/);
  assert.match(dateInput, /name=\{name\}/);
  assert.match(dateInput, /parseDateInputToIso\(displayValue, dateFormat\)/);

  for (const source of [
    adminRecordsPage,
    classRecordPage,
    newActivityPage,
    riskPage,
    teacherBonusPage,
    receptionBonusPage,
    receptionEditPage,
    receptionCalendarPage,
  ]) {
    assert.match(source, /DateInput/);
    assert.match(source, /dateFormat=\{currentUser\.dateFormat\}/);
  }
});

test("class management supports metadata and active teacher assignment", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const classActions = await readProjectFile("src/app/actions/classes.ts");
  const classesPage = await readProjectFile("src/app/admin/classes/page.tsx");
  const newClassPage = await readProjectFile("src/app/admin/classes/new/page.tsx");
  const durationInput = await readProjectFile(
    "src/app/components/duration-input.tsx",
  );
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
  assert.match(classActions, /readDurationMinutes\(formData\.get\("durationMinutes"\)\)/);
  assert.match(classActions, /studentIds/);
  assert.match(classActions, /role: "TEACHER"/);
  assert.match(classActions, /isActive: true/);
  assert.match(classesPage, /Create class/);
  assert.match(classesPage, /formatEntityResultMessage\("Class", params\.status\)/);
  assert.match(classesPage, /Semester/);
  assert.match(classesPage, /classStatus/);
  assert.doesNotMatch(classesPage, /Active and inactive/);
  assert.match(classesPage, /teacherId/);
  assert.match(classesPage, /weekDay/);
  assert.match(classesPage, /hasSome/);
  assert.match(classesPage, /Search enrolled students/);
  assert.match(classesPage, /Class results/);
  assert.match(classesPage, /class-result-card/);
  assert.match(newClassPage, /Class roster/);
  assert.match(newClassPage, /DurationInput/);
  assert.match(newClassPage, /RosterPicker/);
  assert.match(durationInput, /placeholder="HH:MM"/);
  assert.match(durationInput, /formatDuration\(valueMinutes\)/);
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
  assert.match(studentsPage, /formatEntityResultMessage\("Student", params\.status\)/);
  assert.match(studentsPage, /studentSearch/);
  assert.match(studentsPage, /datalist id="admin-students"/);
  assert.match(studentsPage, /Student results/);
  assert.match(studentsPage, /student-result-card/);
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
  assert.match(dashboardPage, /\/admin\/records/);
  assert.match(dashboardPage, /Submitted records/);
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
  assert.match(
    gradeActions,
    /currentUser\.role !== "ADMIN" && currentUser\.role !== "TEACHER"/,
  );
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
  const classSchedule = await readProjectFile("src/lib/class-schedule.ts");
  const timeInput = await readProjectFile("src/app/components/time-input.tsx");
  const durationInput = await readProjectFile(
    "src/app/components/duration-input.tsx",
  );
  const adminActivityPage = await readProjectFile(
    "src/app/admin/work-summary/new-activity/page.tsx",
  );
  const adminMeetingPage = await readProjectFile(
    "src/app/admin/work-summary/new-meeting/page.tsx",
  );
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
  const studentMigration = await readProjectFile(
    "prisma/migrations/20260705160000_add_teacher_work_log_students/migration.sql",
  );

  assert.match(schema, /enum TeacherWorkCategory/);
  assert.match(schema, /BONUS_CLASS/);
  assert.match(schema, /EXTRA_ACTIVITY/);
  assert.doesNotMatch(schema, /GAME_NIGHT/);
  assert.match(schema, /model TeacherWorkLog/);
  assert.match(schema, /subject\s+String\?/);
  assert.match(schema, /teacherId\s+String/);
  assert.match(schema, /createdById\s+String/);
  assert.match(schema, /model TeacherWorkLogStudent/);
  assert.match(schema, /students\s+TeacherWorkLogStudent\[\]/);
  assert.match(schema, /teacherWorkLogs\s+TeacherWorkLogStudent\[\]/);
  assert.match(schema, /@@index\(\[teacherId, workDate\]\)/);
  assert.match(migration, /TeacherWorkLog_durationMinutes_check/);
  assert.match(studentMigration, /CREATE TABLE "TeacherWorkLogStudent"/);
  assert.match(studentMigration, /teacherWorkLogId_studentId/);
  assert.match(workLib, /getTeacherWorkSummary/);
  assert.match(workLib, /status: "SUBMITTED"/);
  assert.match(workLib, /durationMinutes/);
  assert.match(workLib, /students:\s*{/);
  assert.match(workActions, /createTeacherWorkLogAction/);
  assert.match(workActions, /createTeacherMeetingAction/);
  assert.match(workActions, /redirectWithWorkError/);
  assert.match(workActions, /errorRedirectTo/);
  assert.match(workActions, /readOptionalStartTime/);
  assert.match(workActions, /readDurationInputMinutes/);
  assert.match(workActions, /readSelectedStudentIds/);
  assert.match(workActions, /selectedStudentIds/);
  assert.match(workActions, /studentId/);
  assert.match(workActions, /category === "BONUS_CLASS" && !subject/);
  assert.match(workActions, /currentUser\.role === "ADMIN"/);
  assert.match(workActions, /role: "TEACHER"/);
  assert.match(workActions, /teacherWorkLog\.create/);
  assert.match(classSchedule, /formatClockTimeFromMinutes/);
  assert.match(classSchedule, /return formatClockTimeFromMinutes\(minutes\)/);
  assert.match(teacherWorkPage, /Monthly summary/);
  assert.match(teacherWorkPage, /\/dashboard\/work\/new/);
  assert.doesNotMatch(teacherWorkPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /Add activity/);
  assert.match(newActivityPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /name="subject"/);
  assert.match(newActivityPage, /TimeInput/);
  assert.match(newActivityPage, /DurationInput/);
  assert.match(newActivityPage, /RosterPicker/);
  assert.doesNotMatch(newActivityPage, /type="time"/);
  assert.doesNotMatch(newActivityPage, /type="number"/);
  assert.match(newActivityPage, /teacherWorkCategories/);
  assert.match(newActivityPage, /category\.value !== "MEETING"/);
  assert.match(timeInput, /placeholder="HH:MM"/);
  assert.match(timeInput, /type="text"/);
  assert.match(timeInput, /pattern="\(\?:\[01\]\\d\|2\[0-3\]\):\[0-5\]\\d"/);
  assert.match(durationInput, /placeholder="HH:MM"/);
  assert.match(durationInput, /name=\{name\}/);
  assert.match(teacherWorkPage, /Submitted class lessons count automatically/);
  assert.match(teacherWorkPage, /formatDuration/);
  assert.match(teacherWorkPage, /workLog\.students/);
  assert.match(adminWorkPage, /Teacher work summaries/);
  assert.match(adminWorkPage, /getTeacherWorkSummary/);
  assert.doesNotMatch(adminWorkPage, /createTeacherWorkLogAction/);
  assert.doesNotMatch(adminWorkPage, /createTeacherMeetingAction/);
  assert.match(adminWorkPage, /workLog\.students/);
  assert.match(adminActivityPage, /createTeacherWorkLogAction/);
  assert.match(adminActivityPage, /formatTeacherWorkErrorMessage/);
  assert.match(adminActivityPage, /name="errorRedirectTo"/);
  assert.match(adminActivityPage, /RosterPicker/);
  assert.match(adminMeetingPage, /createTeacherMeetingAction/);
  assert.match(adminMeetingPage, /formatTeacherWorkErrorMessage/);
  assert.match(adminMeetingPage, /name="errorRedirectTo"/);
  assert.doesNotMatch(adminWorkPage, /type="time"/);
  assert.doesNotMatch(adminWorkPage, /type="number"/);
  assert.match(adminWorkPage, /All teachers/);
  assert.match(dashboardPage, /\/dashboard\/work/);
  assert.match(dashboardPage, /\/dashboard\/work\/new/);
  assert.match(dashboardPage, /\/admin\/work-summary/);
  assert.match(dashboardPage, /\/admin\/work-summary\/new-activity/);
  assert.match(dashboardPage, /\/admin\/work-summary\/new-meeting/);
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
  const timeInput = await readProjectFile("src/app/components/time-input.tsx");
  const durationInput = await readProjectFile(
    "src/app/components/duration-input.tsx",
  );
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
  assert.match(bonusActions, /normalizeStartTime/);
  assert.match(bonusActions, /readDurationMinutes\(formData\.get\("durationMinutes"\)\)/);
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
  assert.match(receptionCalendarPage, /formatStartTime/);
  assert.match(receptionPage, /\/reception\/bonus-classes\/\$\{bonusClass\.id\}/);
  assert.match(receptionPage, /TimeInput/);
  assert.match(receptionPage, /DurationInput/);
  assert.doesNotMatch(receptionPage, /type="time"/);
  assert.doesNotMatch(receptionPage, /type="number"/);
  assert.match(timeInput, /placeholder="HH:MM"/);
  assert.match(timeInput, /type="text"/);
  assert.match(durationInput, /placeholder="HH:MM"/);
  assert.match(durationInput, /type="text"/);
  assert.match(receptionCombinedRedirectPage, /redirect\("\/reception\/students"\)/);
  assert.match(receptionStudentsPage, /Students/);
  assert.match(receptionStudentsPage, /studentSearch/);
  assert.match(receptionStudentsPage, /datalist id="reception-students"/);
  assert.match(receptionStudentsPage, /Student results/);
  assert.match(receptionStudentsPage, /student-result-card/);
  assert.match(receptionStudentsPage, /const selectedStudentId = query\.studentId/);
  assert.doesNotMatch(receptionStudentsPage, /name="studentId">\s*<option value="">Choose a student/s);
  assert.doesNotMatch(receptionStudentsPage, /studentSearch\s*\?\s*students\.find/s);
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
  assert.match(receptionClassesPage, /Class results/);
  assert.match(receptionClassesPage, /class-result-card/);
  assert.match(receptionClassesPage, /classes\.length} active/);
  assert.match(receptionClassesPage, /buildClassHref/);
  assert.match(receptionClassesPage, /student:\s*{\s*select:\s*{\s*fullName: true,\s*id: true/s);
  assert.match(receptionClassesPage, /\/reception\/students\?studentId=\$\{enrollment\.student\.id\}/);
  assert.doesNotMatch(receptionClassesPage, /classSearch && classes\.length/);
  assert.doesNotMatch(receptionClassesPage, /Choose a class/);
  assert.match(receptionClassesPage, /Recent lessons/);
  assert.match(receptionClassesPage, /Untitled lesson/);
  assert.match(receptionEditPage, /updateBonusClassAction/);
  assert.match(receptionEditPage, /completeBonusClassAction/);
  assert.match(receptionEditPage, /status\?: string/);
  assert.match(receptionEditPage, /TimeInput/);
  assert.match(receptionEditPage, /DurationInput/);
  assert.doesNotMatch(receptionEditPage, /type="time"/);
  assert.doesNotMatch(receptionEditPage, /type="number"/);
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
  const readme = await readProjectFile("README.md");
  const productionDoc = await readProjectFile("docs/production-readiness.md");
  const backupDoc = await readProjectFile("docs/backup-export.md");

  assert.match(readme, /reception@example\.com/);
  assert.match(readme, /one reception account/);
  assert.match(readme, /sample grading records/);
  assert.match(readme, /one submitted class record with attendance and homework/);
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
