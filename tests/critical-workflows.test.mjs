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
  assert.match(dashboard, /dashboard\.teacherWorkflows/);
  assert.match(dashboard, /teacher-class-card/);
  assert.match(
    dashboard,
    /const teacherWeekdayOptions = weekdayOptions\.filter\(\s*\(option\) => option\.value !== "SUNDAY",\s*\);/s,
  );
  assert.match(
    dashboard,
    /return teacherWeekdayOptions\.some\(\(option\) => option\.value === weekday\)/,
  );
  assert.match(dashboard, /const currentWeekday = getCurrentWeekday\(\)/);
  assert.match(dashboard, /return currentWeekday \? \[currentWeekday\] : \[\]/);
  assert.match(dashboard, /defaultChecked=\{selectedDaySet\.has\(weekday\.value\)\}/);
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

test("public landing and shared role shortcuts preserve the UI entry points", async () => {
  const home = await readProjectFile("src/app/page.tsx");
  const loginPage = await readProjectFile("src/app/login/page.tsx");
  const appTopbar = await readProjectFile("src/app/components/app-topbar.tsx");
  const translations = await readProjectFile("src/lib/translations.ts");
  const styles = await readProjectFile("src/app/globals.css");

  assert.doesNotMatch(home, /redirect\("\/login"\)/);
  assert.match(home, /landing\.title/);
  assert.match(home, /const loginHref = `\/login\?locale=\$\{locale\}`/);
  assert.match(home, /public-locale-toggle/);
  assert.match(loginPage, /href="\/"/);
  assert.match(loginPage, /auth\.backToLanding/);
  assert.match(appTopbar, /shortcutsByRole/);
  assert.match(appTopbar, /currentUser\.role/);
  assert.match(appTopbar, /shortcut-link/);
  assert.match(appTopbar, /shortcut-nav-shell/);
  assert.match(appTopbar, /shortcut-scroll-hint/);
  assert.match(appTopbar, /adminPrimaryShortcuts/);
  assert.match(appTopbar, /adminShortcutGroups/);
  assert.match(appTopbar, /updateOwnLocaleAction/);
  assert.match(appTopbar, /accountLocaleOptions/);
  assert.match(appTopbar, /topbar-locale-form/);
  assert.match(appTopbar, /name="redirectTo"/);
  assert.match(appTopbar, /name="locale"/);
  assert.match(appTopbar, /useSearchParams/);
  assert.match(appTopbar, /ShortcutGroupNav/);
  assert.match(appTopbar, /<details/);
  assert.match(appTopbar, /<summary\s+className="shortcut-group-trigger"/);
  assert.match(appTopbar, /open={openGroupKey === group\.labelKey}/);
  assert.match(appTopbar, /event\.preventDefault\(\)/);
  assert.match(appTopbar, /event\.key === "Enter"/);
  assert.match(appTopbar, /event\.key === " "/);
  assert.doesNotMatch(appTopbar, /shortcut-group-chevron/);
  assert.match(appTopbar, /dashboard\.navManagement/);
  assert.match(appTopbar, /dashboard\.navWork/);
  assert.match(appTopbar, /dashboard\.navOperations/);
  assert.match(appTopbar, /\/admin\/work-summary\/new-meeting/);
  assert.match(appTopbar, /\/admin\/substitutions/);
  assert.match(appTopbar, /\/reception/);
  assert.match(appTopbar, /\/dashboard\/work\/new/);
  assert.match(appTopbar, /\/dashboard\/account/);
  assert.match(styles, /\.shortcut-nav/);
  assert.match(styles, /\.admin-shortcut-stack/);
  assert.match(styles, /\.admin-group-nav/);
  assert.match(styles, /\.shortcut-group-trigger/);
  assert.match(styles, /\.shortcut-group-links/);
  assert.match(styles, /overflow-x: auto/);
  assert.match(styles, /body\[data-theme="dark"\]/);
  assert.doesNotMatch(styles, /\.topbar\s*\{[^}]*border-top/s);
  assert.match(styles, /\.topbar-locale-form/);
  assert.match(translations, /landing\.title/);
  assert.match(translations, /auth\.backToLanding/);
  assert.match(translations, /navigation\.primary/);
  assert.match(translations, /dashboard\.adminTools/);
  assert.match(translations, /dashboard\.navManagement/);
  assert.match(translations, /dashboard\.navOperations/);
  assert.match(translations, /dashboard\.navWork/);
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
  assert.match(listPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(detailPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(listPage, /adminReview\.exportCsv/);
  assert.match(listPage, /adminReview\.noSubmittedRecords/);
  assert.match(detailPage, /adminReview\.studentRecords/);
  assert.match(detailPage, /formatAttendanceStatus\(record\.status, t\)/);
  assert.match(exportRoute, /getTranslations\(currentUser\.locale\)/);
  assert.match(exportRoute, /csvHeaders\(t\)/);
  assert.match(exportRoute, /formatShortDate\(lesson\.lessonDate, currentUser\.dateFormat\)/);
  assert.match(exportRoute, /formatShortDateTime\(lesson\.submittedAt, currentUser\.dateFormat\)/);
  assert.doesNotMatch(listPage, /Export CSV/);
  assert.doesNotMatch(detailPage, /Untitled lesson/);
  assert.match(dateFormat, /hour12:\s*false/);
  assert.match(dateFormat, /hourCycle:\s*"h23"/);
});

test("account management supports reset tokens and admin staff setup", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const appLayout = await readProjectFile("src/app/layout.tsx");
  const locale = await readProjectFile("src/lib/locale.ts");
  const messages = await readProjectFile("src/lib/messages.ts");
  const translations = await readProjectFile("src/lib/translations.ts");
  const appTopbar = await readProjectFile("src/app/components/app-topbar.tsx");
  const accountsPage = await readProjectFile(
    "src/app/admin/manage-accounts/page.tsx",
  );
  const accountPage = await readProjectFile("src/app/dashboard/account/page.tsx");
  const adminDataPage = await readProjectFile("src/app/admin/data/page.tsx");
  const newAccountPage = await readProjectFile(
    "src/app/admin/manage-accounts/new/page.tsx",
  );
  const editAccountPage = await readProjectFile(
    "src/app/admin/manage-accounts/[accountId]/page.tsx",
  );

  assert.match(schema, /enum AccountDateFormat/);
  assert.match(schema, /dateFormat\s+AccountDateFormat\s+@default\(DD_MM_YY\)/);
  assert.match(schema, /enum AccountLocale/);
  assert.match(schema, /locale\s+AccountLocale\s+@default\(PT_BR\)/);
  assert.match(locale, /defaultAccountLocale:\s*AccountLocale\s*=\s*"PT_BR"/);
  assert.match(locale, /defaultUnauthenticatedLocale:\s*AccountLocale\s*=\s*defaultAccountLocale/);
  assert.match(locale, /return locale === "PT_BR" \? "pt-BR" : "en"/);
  assert.match(translations, /translationResources/);
  assert.match(translations, /app\.description/);
  assert.match(translations, /auth\.signInTitle/);
  assert.match(translations, /account\.preferredLanguage/);
  assert.match(translations, /dashboard\.adminDashboard/);
  assert.match(translations, /dashboard\.forTeacher/);
  assert.match(translations, /dashboard\.teacherWorkflows/);
  assert.match(translations, /dashboard\.receptionDashboard/);
  assert.match(translations, /empty\.noStaffAccounts/);
  assert.match(translations, /accountManagement\.manageAccounts/);
  assert.match(translations, /accountManagement\.invalidCreateError/);
  assert.match(translations, /accountManagement\.invalidUpdateError/);
  assert.match(translations, /adminStudents\.createStudent/);
  assert.match(translations, /adminStudents\.studentResults/);
  assert.match(translations, /entity\.account/);
  assert.match(translations, /message\.entityCreated/);
  assert.match(translations, /adminReview\.submittedRecordsTitle/);
  assert.match(translations, /adminReview\.substituteLessonsCopy/);
  assert.match(translations, /receptionLookup\.studentResults/);
  assert.match(translations, /receptionLookup\.classResults/);
  assert.match(translations, /message\.teacherWorkInvalid/);
  assert.match(translations, /text\.teacherWorkSubjectPlaceholder/);
  assert.match(translations, /data\.databaseRecordCounts/);
  assert.match(translations, /data\.teachersAndAdmins/);
  assert.match(translations, /label\.term/);
  assert.match(translations, /label\.users/);
  assert.match(translations, /PT_BR/);
  assert.match(translations, /formatMissingTranslation/);
  assert.match(translations, /\[missing translation: \$\{locale\}\.\$\{key\}\]/);
  assert.match(translations, /process\.env\.NODE_ENV === "development"/);
  assert.match(translations, /return fallback \?\? key/);
  assert.match(translations, /return \(key: TranslationKey\) => resolveTranslation\(locale, key\)/);
  assert.match(translations, /return resolveTranslation\(locale, key\)/);
  assert.match(appLayout, /const locale = currentUser\?\.locale \?\? defaultUnauthenticatedLocale/);
  assert.match(appLayout, /formatHtmlLang\(locale\)/);
  assert.match(appLayout, /translate\(defaultUnauthenticatedLocale, "app\.name"\)/);
  assert.match(appLayout, /translate\(defaultUnauthenticatedLocale, "app\.description"\)/);
  assert.doesNotMatch(appLayout, /title:\s*"School Records Platform"/);
  assert.doesNotMatch(
    appLayout,
    /Teacher attendance and homework records for ESL schools\./,
  );
  assert.match(schema, /model PasswordResetToken/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.match(accountActions, /requestPasswordResetAction/);
  assert.match(accountActions, /resetPasswordAction/);
  assert.match(accountActions, /updateOwnDateFormatAction/);
  assert.match(accountActions, /normalizeAccountDateFormat/);
  assert.match(accountActions, /updateOwnLocaleAction/);
  assert.match(accountActions, /normalizeAccountLocale/);
  assert.match(accountActions, /createAccountAction/);
  assert.match(accountActions, /locale:\s*defaultAccountLocale/);
  assert.match(accountActions, /updateAccountAction/);
  assert.match(accountActions, /role !== "TEACHER" && role !== "RECEPTION"/);
  assert.match(accountActions, /isActive/);
  assert.match(messages, /formatEntityResultMessage/);
  assert.match(messages, /status !== "created" && status !== "updated"/);
  assert.match(messages, /formatTeacherWorkErrorMessage/);
  assert.match(accountPage, /accountDateFormatOptions/);
  assert.match(accountPage, /name="dateFormat"/);
  assert.match(accountPage, /accountLocaleOptions/);
  assert.match(accountPage, /updateOwnLocaleAction/);
  assert.match(accountPage, /name="locale"/);
  assert.match(accountPage, /name="redirectTo"/);
  assert.match(accountPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(appTopbar, /updateOwnLocaleAction/);
  assert.match(appTopbar, /accountLocaleOptions/);
  assert.match(accountPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(appTopbar, /t\("app\.name"\)/);
  assert.match(appTopbar, /t\("label\.signOut"\)/);
  assert.match(accountPage, /t\("dashboard\.account"\)/);
  assert.doesNotMatch(accountPage, /Sign out/);
  assert.doesNotMatch(accountPage, /<p className="eyebrow">Account<\/p>/);
  assert.match(adminDataPage, /getCurrentUser\(\)/);
  assert.match(
    adminDataPage,
    /getTranslations\(currentUser\?\.locale \?\? defaultUnauthenticatedLocale\)/,
  );
  assert.match(adminDataPage, /data\.databaseRecordCounts/);
  assert.match(adminDataPage, /data\.databaseTables/);
  assert.match(adminDataPage, /data\.teachersAndAdmins/);
  assert.match(adminDataPage, /formatLessonStatus\(lesson\.status, t\)/);
  assert.doesNotMatch(adminDataPage, /Local school data from PostgreSQL/);
  assert.doesNotMatch(adminDataPage, /Database record counts/);
  assert.doesNotMatch(adminDataPage, /Teachers and Admins/);
  assert.doesNotMatch(adminDataPage, /Recent Lessons/);
  assert.doesNotMatch(adminDataPage, />\s*Home\s*</);
  assert.match(accountsPage, /accountManagement\.manageAccounts/);
  assert.match(accountsPage, /formatAccountRole/);
  assert.match(accountsPage, /formatEntityResultMessage\(\s*"Account",\s*params\.status,\s*currentUser\.locale/s);
  assert.match(accountsPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(accountsPage, /empty\.noStaffAccounts/);
  assert.match(newAccountPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(newAccountPage, /accountManagement\.createAccount/);
  assert.match(newAccountPage, /accountManagement\.invalidCreateError/);
  assert.match(newAccountPage, /value="RECEPTION"/);
  assert.match(editAccountPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(editAccountPage, /accountManagement\.editAccount/);
  assert.match(editAccountPage, /accountManagement\.invalidUpdateError/);
  assert.match(editAccountPage, /accountManagement\.leavePasswordBlank/);
  assert.doesNotMatch(accountsPage, /Manage accounts/);
  assert.doesNotMatch(newAccountPage, /Create account/);
  assert.doesNotMatch(editAccountPage, /Edit account/);
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
  const classDetailPage = await readProjectFile(
    "src/app/dashboard/classes/[classId]/page.tsx",
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
  const staffCalendarPage = await readProjectFile(
    "src/app/components/staff-calendar-page.tsx",
  );
  const calendarLib = await readProjectFile("src/lib/calendar.ts");
  const teacherCalendarPage = await readProjectFile(
    "src/app/dashboard/calendar/page.tsx",
  );

  assert.match(session, /dateFormat: true/);
  assert.match(session, /locale: true/);
  assert.match(prismaClient, /add_class_types_and_schedule_time/);
  assert.match(dateFormat, /parseDateInputToIso/);
  assert.match(dateFormat, /formatIsoDateInput/);
  assert.match(dateInput, /"use client"/);
  assert.match(dateInput, /type="text"/);
  assert.match(dateInput, /type="hidden"/);
  assert.match(dateInput, /type="date"/);
  assert.match(dateInput, /date-calendar-input/);
  assert.match(dateInput, /calendarLabel/);
  assert.match(dateInput, /placeholderLabels/);
  assert.match(dateInput, /hideFormatHint = true/);
  assert.match(dateInput, /hideFormatHint/);
  assert.match(dateInput, /title=\{placeholder\}/);
  assert.match(dateInput, /name=\{name\}/);
  assert.match(dateInput, /parseDateInputToIso\(displayValue, dateFormat\)/);
  assert.match(classRecordPage, /dashboard\.semester/);
  assert.match(classRecordPage, /dashboard\.withTeacher/);
  assert.match(classRecordPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(classDetailPage, /dashboard\.semester/);
  assert.match(classDetailPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(riskPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(teacherBonusPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(receptionBonusPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(staffCalendarPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.doesNotMatch(classRecordPage, /Semester \$\{schoolClass\.semester\}/);
  assert.doesNotMatch(classDetailPage, /Semester \$\{schoolClass\.semester\}/);
  assert.doesNotMatch(classRecordPage, /currentUser\.locale === "PT_BR" \? "com" : "with"/);
  assert.doesNotMatch(classRecordPage, /<strong>School Records Platform<\/strong>/);
  assert.doesNotMatch(classDetailPage, /<strong>School Records Platform<\/strong>/);

  for (const source of [
    adminRecordsPage,
    classRecordPage,
    newActivityPage,
    riskPage,
    teacherBonusPage,
    receptionBonusPage,
    receptionEditPage,
    staffCalendarPage,
    teacherCalendarPage,
  ]) {
    assert.match(source, /DateInput/);
    assert.match(source, /dateFormat=\{currentUser\.dateFormat\}/);
    assert.match(source, /calendarLabel=\{t\("dashboard\.calendar"\)\}/);
  }
});

test("class management supports metadata and active teacher assignment", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const classActions = await readProjectFile("src/app/actions/classes.ts");
  const classesPage = await readProjectFile("src/app/admin/classes/page.tsx");
  const newClassPage = await readProjectFile("src/app/admin/classes/new/page.tsx");
  const editClassPage = await readProjectFile(
    "src/app/admin/classes/[classId]/page.tsx",
  );
  const durationInput = await readProjectFile(
    "src/app/components/duration-input.tsx",
  );
  const rosterPicker = await readProjectFile(
    "src/app/admin/classes/roster-picker.tsx",
  );
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");

  assert.match(schema, /book\s+String\?/);
  assert.match(schema, /enum ClassType/);
  assert.match(schema, /REGULAR/);
  assert.match(schema, /VIP/);
  assert.match(schema, /PERSONAL/);
  assert.match(schema, /classType\s+ClassType\s+@default\(REGULAR\)/);
  assert.match(schema, /startTime\s+String\?/);
  assert.match(schema, /semester\s+Int\?/);
  assert.match(schema, /year\s+Int\?/);
  assert.match(classActions, /createClassAction/);
  assert.match(classActions, /updateClassAction/);
  assert.match(classActions, /updateClassRosterAction/);
  assert.match(classActions, /readClassType/);
  assert.match(classActions, /readOptionalStartTime\(formData\.get\("startTime"\)\)/);
  assert.match(classActions, /hasSingleStudentLimit/);
  assert.match(classActions, /hasSingleStudentLimit\(classData\.classType\) && selectedStudentIds\.length > 1/);
  assert.match(classActions, /hasSingleStudentLimit\(classData\.classType\) && activeStudentIds\.length > 1/);
  assert.match(classActions, /hasSingleStudentLimit\(schoolClass\.classType\)[\s\S]*selectedStudentIds\.length > 1/);
  assert.match(classActions, /hasClassScheduleConflict/);
  assert.match(classActions, /hasMoreThanThreeConcurrentPersonalStudents/);
  assert.match(classActions, /segmentStart/);
  assert.match(classActions, /segmentEnd/);
  assert.match(classActions, /readDurationMinutes\(formData\.get\("durationMinutes"\)\)/);
  assert.match(classActions, /studentIds/);
  assert.match(classActions, /role: "TEACHER"/);
  assert.match(classActions, /isActive: true/);
  assert.match(classesPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(classesPage, /adminClasses\.createClass/);
  assert.match(classesPage, /formatEntityResultMessage\(\s*"Class",\s*params\.status,\s*currentUser\.locale/s);
  assert.match(classesPage, /dashboard\.semester/);
  assert.match(classesPage, /classType: true/);
  assert.match(classesPage, /startTime: true/);
  assert.match(classesPage, /formatClassType/);
  assert.match(classesPage, /classStatus/);
  assert.match(classesPage, /return value === "all" \? "all" : "active"/);
  assert.match(classesPage, /const currentYear = new Date\(\)\.getUTCFullYear\(\)/);
  assert.match(classesPage, /readFilterValue\(params\.year\) === undefined/);
  assert.doesNotMatch(classesPage, /Active and inactive/);
  assert.match(classesPage, /teacherId/);
  assert.match(classesPage, /weekDay/);
  assert.match(classesPage, /hasSome/);
  assert.match(classesPage, /adminClasses\.searchEnrolledStudents/);
  assert.match(classesPage, /adminClasses\.classResults/);
  assert.match(classesPage, /class-result-card/);
  assert.match(newClassPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(newClassPage, /adminClasses\.classRoster/);
  assert.match(newClassPage, /adminClasses\.invalidError/);
  assert.match(newClassPage, /adminClasses\.scheduleError/);
  assert.match(newClassPage, /classTypeOptions/);
  assert.match(newClassPage, /TimeInput/);
  assert.match(newClassPage, /adminClasses\.namePlaceholder/);
  assert.match(newClassPage, /adminClasses\.bookPlaceholder/);
  assert.match(newClassPage, /DurationInput/);
  assert.match(newClassPage, /RosterPicker/);
  assert.match(newClassPage, /labels=\{rosterLabels\}/);
  assert.doesNotMatch(newClassPage, /Evening English A2/);
  assert.match(editClassPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(editClassPage, /adminClasses\.editClass/);
  assert.match(editClassPage, /adminClasses\.classRosterUpdated/);
  assert.match(editClassPage, /adminClasses\.openClassPage/);
  assert.match(editClassPage, /\/dashboard\/classes\/\$\{schoolClass\.id\}/);
  assert.match(editClassPage, /adminClasses\.scheduleError/);
  assert.match(editClassPage, /classTypeOptions/);
  assert.match(editClassPage, /TimeInput/);
  assert.match(editClassPage, /labels=\{rosterLabels\}/);
  assert.match(durationInput, /placeholder=\{placeholder\}/);
  assert.match(durationInput, /formatDuration\(valueMinutes\)/);
  assert.match(rosterPicker, /labels\.search/);
  assert.match(rosterPicker, /labels\.noMatches/);
  assert.match(rosterPicker, /selectionName = "studentIds"/);
  assert.doesNotMatch(classesPage, /Create class/);
  assert.doesNotMatch(classesPage, /Class results/);
  assert.doesNotMatch(newClassPage, /Class roster/);
  assert.doesNotMatch(editClassPage, /Class roster updated\./);
  assert.doesNotMatch(rosterPicker, /Search students/);
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
  assert.match(studentsPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(studentsPage, /adminStudents\.createStudent/);
  assert.match(studentsPage, /formatEntityResultMessage\(\s*"Student",\s*params\.status,\s*currentUser\.locale/s);
  assert.match(studentsPage, /studentSearch/);
  assert.match(studentsPage, /studentStatus/);
  assert.match(studentsPage, /readStudentStatusFilter/);
  assert.match(studentsPage, /return "active"/);
  assert.match(studentsPage, /datalist id="admin-students"/);
  assert.match(studentsPage, /adminStudents\.studentResults/);
  assert.match(studentsPage, /student-result-card/);
  assert.match(studentsPage, /\/admin\/students\/\$\{student\.id\}\/view/);
  assert.doesNotMatch(studentsPage, /label\.view/);
  assert.doesNotMatch(studentsPage, /label\.edit/);
  assert.match(studentsPage, /adminStudents\.noMatches/);
  assert.match(newStudentPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(newStudentPage, /createStudentAction/);
  assert.match(newStudentPage, /adminStudents\.invalidError/);
  assert.match(newStudentPage, /adminStudents\.createStudent/);
  assert.doesNotMatch(newStudentPage, /adminStudents\.enrollmentIdentifier/);
  assert.doesNotMatch(newStudentPage, /duplicateIdentifierError/);
  assert.match(editStudentPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(editStudentPage, /updateStudentAction/);
  assert.match(editStudentPage, /adminStudents\.editStudent/);
  assert.match(editStudentPage, /adminStudents\.saveStudent/);
  assert.doesNotMatch(studentsPage, /Create student/);
  assert.doesNotMatch(studentsPage, /Student results/);
  assert.doesNotMatch(newStudentPage, /Enter the student's full name\./);
  assert.doesNotMatch(editStudentPage, /Edit student/);
  assert.match(viewStudentPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(viewStudentPage, /adminStudents\.studentProfile/);
  assert.match(viewStudentPage, /adminStudents\.editStudent/);
  assert.doesNotMatch(viewStudentPage, /Student profile/);
  assert.doesNotMatch(viewStudentPage, /Edit student/);
  assert.match(viewStudentPage, /StudentProfilePanel/);
  assert.match(viewStudentPage, /locale=\{currentUser\.locale\}/);
  assert.match(studentProfilePanel, /receptionLookup\.currentActiveClass/);
  assert.match(studentProfilePanel, /receptionLookup\.lastClassLesson/);
  assert.match(studentProfilePanel, /absentLessons/);
  assert.match(studentProfilePanel, /gradeClassId/);
  assert.match(recordForm, /student:\s*{\s*isActive: true/s);
  assert.match(recordForm, /text\.lessonNamePlaceholder/);
  assert.match(recordForm, /text\.lessonNotesPlaceholder/);
  assert.match(recordForm, /text\.adminReviewNotePlaceholder/);
  assert.match(recordForm, /adminReview\.submittedBy/);
  assert.match(recordForm, /teacherAccounts/);
  assert.match(recordForm, /name="submittedById"/);
  assert.doesNotMatch(recordForm, /Conversation practice/);
  assert.doesNotMatch(dashboardPage, /\/admin\/records/);
  assert.doesNotMatch(dashboardPage, /dashboard\.submittedRecords/);
  assert.match(dashboardPage, /dashboard-metric-grid/);
  assert.doesNotMatch(dashboardPage, /dashboard-action-grid/);
  assert.doesNotMatch(dashboardPage, /dashboard-action-card/);
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
  assert.match(exportRoute, /export\.lessonName/);
  assert.match(exportRoute, /export\.attendance/);
  assert.match(exportRoute, /export\.homework/);
  assert.doesNotMatch(exportRoute, /"lesson_name"/);
  assert.match(exportRoute, /currentUser\.dateFormat/);
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
  assert.match(classDetail, /label\.saveGrades/);
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
});

test("admin risk review flags attendance and homework signals", async () => {
  const riskPage = await readProjectFile("src/app/admin/risk/page.tsx");
  const dashboardPage = await readProjectFile("src/app/dashboard/page.tsx");
  const translations = await readProjectFile("src/lib/translations.ts");
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
  assert.match(riskPage, /riskSignal\.incompleteHomework/);
  assert.match(riskPage, /riskSignal\.lowTestTotal/);
  assert.match(riskPage, /riskSignal\.lowOralGrade/);
  assert.match(riskPage, /riskSignal\.missedClasses/);
  assert.match(riskPage, /riskSignal\.consecutiveMissedClasses/);
  assert.match(riskPage, /label\.resolved/);
  assert.match(riskPage, /label\.undoResolve/);
  assert.doesNotMatch(riskPage, /<strong>School Records Platform<\/strong>/);
  assert.doesNotMatch(riskPage, /incomplete homework/);
  assert.doesNotMatch(riskPage, /test total below 7/);
  assert.doesNotMatch(riskPage, /oral grade C or below/);
  assert.doesNotMatch(riskPage, /missed classes/);
  assert.match(dashboardPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.doesNotMatch(dashboardPage, /Sign out/);
  assert.match(translations, /riskSignal\.incompleteHomework/);
  assert.match(translations, /riskSignal\.lowTestTotal/);
  assert.match(translations, /riskSignal\.lowOralGrade/);
  assert.match(translations, /riskSignal\.missedClasses/);
  assert.match(translations, /riskSignal\.consecutiveMissedClasses/);
  assert.doesNotMatch(translations, /Excused absences and late arrivals are not counted/);
  assert.doesNotMatch(translations, /Faltas justificadas e atrasos n.o contam/);
  assert.match(dataModelDoc, /mark a student\/class risk row as resolved/);
  assert.match(dataModelDoc, /Risk Review/);
});

test("teacher work summaries count lessons and paid activity logs", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const workLib = await readProjectFile("src/lib/teacher-work.ts");
  const workActions = await readProjectFile("src/app/actions/teacher-work.ts");
  const messages = await readProjectFile("src/lib/messages.ts");
  const classSchedule = await readProjectFile("src/lib/class-schedule.ts");
  const bonusLib = await readProjectFile("src/lib/bonus-classes.ts");
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
  assert.match(workActions, /requireCompleteActivity/);
  assert.match(workActions, /\(category === "BONUS_CLASS" \|\| requireCompleteActivity\) && !subject/);
  assert.match(workActions, /requireCompleteActivity && !startTime/);
  assert.match(workActions, /requireCompleteActivity && selectedStudents\.length === 0/);
  assert.match(workActions, /currentUser\.role === "ADMIN"/);
  assert.match(workActions, /role: "TEACHER"/);
  assert.match(workActions, /teacherWorkLog\.create/);
  assert.match(classSchedule, /formatClockTimeFromMinutes/);
  assert.match(classSchedule, /return formatClockTimeFromMinutes\(minutes\)/);
  assert.match(bonusLib, /formatClockTimeFromMinutes/);
  assert.match(bonusLib, /return formatClockTimeFromMinutes\(totalMinutes\)/);
  assert.match(
    messages,
    /message\.teacherWorkInvalid/,
  );
  assert.match(teacherWorkPage, /dashboard\.monthlySummary/);
  assert.match(teacherWorkPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(teacherWorkPage, /dashboard\.forTeacher/);
  assert.match(dashboardPage, /formatWeekdays\(card\.weekDays, currentUser\.locale\)/);
  assert.match(teacherWorkPage, /\/dashboard\/work\/new/);
  assert.match(teacherWorkPage, /dashboard\.addActivity/);
  assert.doesNotMatch(teacherWorkPage, /Add event/);
  assert.doesNotMatch(teacherWorkPage, /currentUser\.locale === "PT_BR" \? "de" : "for"/);
  assert.doesNotMatch(teacherWorkPage, /<strong>School Records Platform<\/strong>/);
  assert.doesNotMatch(teacherWorkPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /dashboard\.addActivity/);
  assert.doesNotMatch(newActivityPage, /Add event/);
  assert.match(newActivityPage, /createTeacherWorkLogAction/);
  assert.match(newActivityPage, /text\.teacherWorkSubjectPlaceholder/);
  assert.doesNotMatch(newActivityPage, /Required for bonus classes/);
  assert.match(newActivityPage, /name="subject"/);
  assert.match(newActivityPage, /TimeInput/);
  assert.match(newActivityPage, /DurationInput/);
  assert.match(newActivityPage, /RosterPicker/);
  assert.doesNotMatch(newActivityPage, /type="time"/);
  assert.doesNotMatch(newActivityPage, /type="number"/);
  assert.match(newActivityPage, /teacherWorkCategories/);
  assert.match(newActivityPage, /category\.value !== "MEETING"/);
  assert.match(timeInput, /placeholder=\{placeholder\}/);
  assert.match(timeInput, /type="text"/);
  assert.match(timeInput, /pattern="\(\?:\[01\]\\d\|2\[0-3\]\):\[0-5\]\\d"/);
  assert.match(durationInput, /placeholder=\{placeholder\}/);
  assert.match(durationInput, /name=\{name\}/);
  assert.match(teacherWorkPage, /text\.workSummaryTeacherCopy/);
  assert.match(teacherWorkPage, /formatDuration/);
  assert.match(teacherWorkPage, /workLog\.students/);
  assert.match(adminWorkPage, /dashboard\.workSummaries/);
  assert.match(adminWorkPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(adminWorkPage, /getTeacherWorkSummary/);
  assert.match(adminWorkPage, /\.filter\(\(teacher\) => teacher\.isActive\)/);
  assert.match(adminWorkPage, /type="month"/);
  assert.match(adminWorkPage, /work-summary-details/);
  assert.match(adminWorkPage, /label\.completeList/);
  assert.match(adminWorkPage, /pendingSubstituteLessons\.length/);
  assert.doesNotMatch(adminWorkPage, /createTeacherWorkLogAction/);
  assert.doesNotMatch(adminWorkPage, /createTeacherMeetingAction/);
  assert.doesNotMatch(adminWorkPage, /<strong>School Records Platform<\/strong>/);
  assert.match(adminWorkPage, /workLog\.students/);
  assert.match(adminActivityPage, /createTeacherWorkLogAction/);
  assert.match(adminActivityPage, /formatTeacherWorkErrorMessage/);
  assert.match(adminActivityPage, /name="errorRedirectTo"/);
  assert.match(adminActivityPage, /name="requireCompleteActivity"/);
  assert.match(adminActivityPage, /category\.value !== "MEETING"/);
  assert.match(adminActivityPage, /RosterPicker/);
  assert.match(adminActivityPage, /text\.teacherWorkSubjectPlaceholder/);
  assert.match(adminActivityPage, /name="subject"[\s\S]*required/);
  assert.match(adminActivityPage, /hideFormatHint/);
  assert.match(adminActivityPage, /label\.dayMonthYearFormat/);
  assert.match(adminActivityPage, /<TimeInput name="startTime" required \/>/);
  assert.doesNotMatch(adminActivityPage, /Required for bonus classes/);
  assert.match(adminMeetingPage, /createTeacherMeetingAction/);
  assert.match(adminMeetingPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(adminMeetingPage, /formatTeacherWorkErrorMessage/);
  assert.match(adminMeetingPage, /name="errorRedirectTo"/);
  assert.doesNotMatch(adminWorkPage, /type="time"/);
  assert.doesNotMatch(adminWorkPage, /type="number"/);
  assert.match(adminWorkPage, /label\.allTeachers/);
  assert.match(dashboardPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.doesNotMatch(dashboardPage, /Add event/);
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
  const translations = await readProjectFile("src/lib/translations.ts");
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
  assert.match(recordActions, /requestedSubmittedById/);
  assert.match(recordActions, /currentUser\.role === "ADMIN"/);
  assert.match(recordActions, /role: "TEACHER"/);
  assert.match(recordActions, /submittedById: submittedBy\.id/);
  assert.match(recordActions, /PENDING_APPROVAL/);
  assert.match(recordActions, /taughtById: currentUser\.id/);
  assert.match(recordActions, /\/dashboard\/work\?status=substitution-pending/);
  assert.match(recordPage, /substitute === "1"/);
  assert.match(recordPage, /label\.substituteClassRecord/);
  assert.match(recordPage, /substitutionNotes/);
  assert.match(substitutionPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(substitutionPage, /dashboard\.substituteLesson/);
  assert.match(substitutionPage, /substitution\.chooseClassCopy/);
  assert.match(substitutionPage, /substitution\.recordSubstituteLesson/);
  assert.match(substitutionPage, /substitution\.noClassesAvailable/);
  assert.match(substitutionPage, /searchParams/);
  assert.match(substitutionPage, /name="teacherId"/);
  assert.match(substitutionPage, /name="weekDayFilter"/);
  assert.match(substitutionPage, /name="weekDay"/);
  assert.match(substitutionPage, /type="checkbox"/);
  assert.match(substitutionPage, /defaultChecked=\{selectedWeekdaySet\.has\(weekday\.value\)\}/);
  assert.match(substitutionPage, /getCurrentWeekday/);
  assert.match(substitutionPage, /America\/Sao_Paulo/);
  assert.match(substitutionPage, /selectedTeacherId/);
  assert.match(substitutionPage, /weekDays: \{ hasSome: selectedWeekdays \}/);
  assert.match(substitutionPage, /substitution\.filterCopy/);
  assert.match(substitutionPage, /substitution\.noClassesMatchCopy/);
  assert.match(substitutionPage, /filter-panel substitution-filter-panel/);
  assert.match(substitutionPage, /filter-panel-heading/);
  assert.match(substitutionPage, /role="group"/);
  assert.doesNotMatch(substitutionPage, /<fieldset className="weekday-filter">/);
  assert.doesNotMatch(substitutionPage, /name="classSearch"/);
  assert.match(substitutionPage, /not: currentUser\.id/);
  assert.match(substitutionPage, /substitute=1/);
  assert.match(substitutionPage, /formatWeekdays\(schoolClass\.weekDays, currentUser\.locale\)/);
  assert.doesNotMatch(substitutionPage, /Substitute lesson/);
  assert.doesNotMatch(substitutionPage, /No classes available/);
  assert.match(translations, /"substitution\.filterCopy"/);
  assert.match(translations, /"substitution\.noClassesMatchCopy"/);
  assert.match(substitutionActions, /approveSubstitutionAction/);
  assert.match(substitutionActions, /rejectSubstitutionAction/);
  assert.match(substitutionActions, /undoSubstitutionApprovalAction/);
  assert.match(substitutionActions, /substitutionReviewedById/);
  assert.match(adminSubstitutionsPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(adminSubstitutionsPage, /approveSubstitutionAction/);
  assert.match(adminSubstitutionsPage, /rejectSubstitutionAction/);
  assert.match(adminSubstitutionsPage, /formatSubstitutionStatus/);
  assert.match(adminSubstitutionsPage, /adminReview\.undoApproval/);
  assert.match(adminSubstitutionsPage, /adminReview\.noSubstituteLessons/);
  assert.doesNotMatch(adminSubstitutionsPage, /Undo approval/);
  assert.doesNotMatch(adminSubstitutionsPage, /<p className="eyebrow">\{lesson\.substitutionStatus\}<\/p>/);
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
  const adminCalendarPage = await readProjectFile(
    "src/app/admin/calendar/page.tsx",
  );
  const staffCalendarPage = await readProjectFile(
    "src/app/components/staff-calendar-page.tsx",
  );
  const calendarGrid = await readProjectFile(
    "src/app/components/calendar-grid.tsx",
  );
  const calendarLib = await readProjectFile("src/lib/calendar.ts");
  const teacherCalendarPage = await readProjectFile(
    "src/app/dashboard/calendar/page.tsx",
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
  assert.match(receptionDashboardPage, /dashboard-metric-grid/);
  assert.doesNotMatch(receptionDashboardPage, /dashboard-action-grid/);
  assert.doesNotMatch(receptionDashboardPage, /dashboard-action-card/);
  assert.match(receptionDashboardPage, /upcomingBonusClasses/);
  assert.match(receptionDashboardPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(receptionDashboardPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(receptionDashboardPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.doesNotMatch(receptionDashboardPage, /Sign out/);
  assert.match(receptionPage, /label\.scheduleBonusClass/);
  assert.match(receptionPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(receptionPage, /studentSearch/);
  assert.match(receptionPage, /receptionLookup\.studentSearchPlaceholder/);
  assert.doesNotMatch(receptionPage, /Type a student name/);
  assert.doesNotMatch(receptionPage, /Bonus class \{query\.status\}/);
  assert.match(receptionPage, /formatBonusClassResultMessage/);
  assert.match(receptionPage, /formatBonusClassErrorMessage/);
  assert.match(receptionCalendarPage, /StaffCalendarPage/);
  assert.match(adminCalendarPage, /StaffCalendarPage/);
  assert.match(staffCalendarPage, /calendar\.weeklyTitle/);
  assert.match(staffCalendarPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(staffCalendarPage, /CalendarGrid/);
  assert.match(staffCalendarPage, /collapseOverlaps/);
  assert.match(staffCalendarPage, /getCalendarWeekDates/);
  assert.match(staffCalendarPage, /schoolClass\.weekDays\.includes\(weekday\)/);
  assert.match(staffCalendarPage, /mode="week"/);
  assert.match(staffCalendarPage, /hideFormatHint/);
  assert.match(staffCalendarPage, /\/reception\/classes\?classId=/);
  assert.match(staffCalendarPage, /\/admin\/classes\//);
  assert.match(staffCalendarPage, /status: \{ not: "CANCELED" \}/);
  assert.match(staffCalendarPage, /teacherWorkLog\.findMany/);
  assert.match(staffCalendarPage, /category: "MEETING"/);
  assert.match(staffCalendarPage, /createdBy: \{ role: "ADMIN" \}/);
  assert.match(staffCalendarPage, /collapseAdminMeetings/);
  assert.match(staffCalendarPage, /teacherNames\.join\(", "\)/);
  assert.match(calendarGrid, /schedule-event-meta">\{event\.teacherName\}/);
  assert.match(calendarGrid, /event\.kind === "MEETING"/);
  assert.match(calendarGrid, /groupOverlappingEvents/);
  assert.match(calendarGrid, /calendar\.overlappingEvents/);
  assert.match(calendarGrid, /groupEndMinutes/);
  assert.match(calendarGrid, /startMinutes >= currentGroupEnd/);
  assert.match(calendarGrid, /personalSlots\.occupied/);
  assert.match(calendarGrid, /schedule-event-personal-group/);
  assert.match(calendarGrid, /schedule-event-group/);
  assert.match(calendarGrid, /event\.book/);
  assert.match(calendarGrid, /durationMinutes \/ 30/);
  assert.match(calendarGrid, /laneEndMinutes/);
  assert.match(calendarGrid, /schedule-event-positioned/);
  assert.match(teacherCalendarPage, /CalendarGrid/);
  assert.match(teacherCalendarPage, /getCalendarWeekDates/);
  assert.match(teacherCalendarPage, /\/dashboard\/classes\//);
  assert.match(teacherCalendarPage, /\/dashboard\/bonus-classes\?/);
  assert.match(teacherCalendarPage, /currentUser\.role !== "TEACHER"/);
  assert.match(teacherCalendarPage, /teacherWorkLog\.findMany/);
  assert.match(teacherCalendarPage, /category: "MEETING"/);
  assert.match(teacherCalendarPage, /createdBy: \{ role: "ADMIN" \}/);
  assert.match(calendarLib, /calendarTimeSlots/);
  assert.match(calendarLib, /length: 27/);
  assert.match(calendarLib, /8 \* 60 \+ index \* 30/);
  assert.match(calendarLib, /CalendarMeetingEvent/);
  assert.match(calendarLib, /getCalendarWeekStart/);
  assert.match(calendarLib, /weekdayByJavaScriptDay/);
  assert.match(receptionPage, /\/reception\/bonus-classes\/\$\{bonusClass\.id\}/);
  assert.match(receptionPage, /TimeInput/);
  assert.match(receptionPage, /DurationInput/);
  assert.doesNotMatch(receptionPage, /type="time"/);
  assert.doesNotMatch(receptionPage, /type="number"/);
  assert.match(timeInput, /placeholder=\{placeholder\}/);
  assert.match(timeInput, /type="text"/);
  assert.match(durationInput, /placeholder=\{placeholder\}/);
  assert.match(durationInput, /type="text"/);
  assert.match(receptionCombinedRedirectPage, /redirect\("\/reception\/students"\)/);
  assert.match(receptionStudentsPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(receptionStudentsPage, /dashboard\.students/);
  assert.match(receptionStudentsPage, /studentSearch/);
  assert.match(receptionStudentsPage, /datalist id="reception-students"/);
  assert.match(receptionStudentsPage, /receptionLookup\.studentResults/);
  assert.match(receptionStudentsPage, /receptionLookup\.studentsCopy/);
  assert.match(receptionStudentsPage, /student-result-card/);
  assert.match(receptionStudentsPage, /const selectedStudentId = query\.studentId/);
  assert.doesNotMatch(receptionStudentsPage, /name="studentId">\s*<option value="">Choose a student/s);
  assert.doesNotMatch(receptionStudentsPage, /studentSearch\s*\?\s*students\.find/s);
  assert.match(receptionStudentsPage, /StudentProfilePanel/);
  assert.match(receptionStudentsPage, /locale=\{currentUser\.locale\}/);
  assert.match(receptionStudentsPage, /studentId=\$\{student\.id\}/);
  assert.match(studentProfilePanel, /absentLessons/);
  assert.match(studentProfilePanel, /gradeClassId/);
  assert.match(studentProfilePanel, /getTranslations\(locale\)/);
  assert.match(studentProfilePanel, /formatPartialEvaluationPeriodLabel\(period\.value, locale\)/);
  assert.match(studentProfilePanel, /formatTestPeriodLabel\(period\.value, locale\)/);
  assert.match(studentProfilePanel, /student-profile-summary/);
  assert.match(studentProfilePanel, /student-grade-cards/);
  assert.match(receptionClassesPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(receptionClassesPage, /dashboard\.classes/);
  assert.match(receptionClassesPage, /datalist id="reception-classes"/);
  assert.match(receptionClassesPage, /teacherId/);
  assert.match(receptionClassesPage, /weekDay/);
  assert.match(receptionClassesPage, /hasSome/);
  assert.match(receptionClassesPage, /checkbox-label/);
  assert.match(receptionClassesPage, /receptionLookup\.classResults/);
  assert.match(receptionClassesPage, /receptionLookup\.classesCopy/);
  assert.match(receptionClassesPage, /class-result-card/);
  assert.match(receptionClassesPage, /receptionLookup\.activeClassesFound/);
  assert.match(receptionClassesPage, /buildClassHref/);
  assert.match(receptionClassesPage, /student:\s*{\s*select:\s*{\s*fullName: true,\s*id: true/s);
  assert.match(receptionClassesPage, /\/reception\/students\?studentId=\$\{enrollment\.student\.id\}/);
  assert.doesNotMatch(receptionClassesPage, /classSearch && classes\.length/);
  assert.doesNotMatch(receptionClassesPage, /Choose a class/);
  assert.match(receptionClassesPage, /label\.recentLessons/);
  assert.match(receptionClassesPage, /adminReview\.untitledLesson/);
  assert.match(receptionEditPage, /updateBonusClassAction/);
  assert.match(receptionEditPage, /completeBonusClassAction/);
  assert.match(receptionEditPage, /status\?: string/);
  assert.match(receptionEditPage, /TimeInput/);
  assert.match(receptionEditPage, /DurationInput/);
  assert.doesNotMatch(receptionEditPage, /type="time"/);
  assert.doesNotMatch(receptionEditPage, /type="number"/);
  assert.match(receptionEditPage, /formatBonusClassResultMessage/);
  assert.match(receptionEditPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(receptionEditPage, /dashboard\.withTeacher/);
  assert.doesNotMatch(receptionEditPage, /currentUser\.locale === "PT_BR" \? "com" : "with"/);
  assert.match(teacherBonusPage, /attendanceStatus/);
  assert.match(teacherBonusPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(teacherBonusPage, /bonus-calendar/);
  assert.match(teacherBonusPage, /dateFrom/);
  assert.match(teacherBonusPage, /formatBonusClassResultMessage/);
  assert.match(globalStyles, /schedule-table/);
  assert.match(globalStyles, /grid-template-rows: repeat\(27, var\(--calendar-row-height\)\)/);
  assert.match(globalStyles, /height: 1890px/);
  assert.match(dashboardPage, /currentUser\.role === "RECEPTION"/);
  assert.match(dashboardPage, /dashboard\.adminDashboard/);
  assert.match(dashboardPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(dashboardPage, /getTranslations\(currentUser\.locale\)/);
  assert.match(workLib, /bonusClasses/);
  assert.match(workLib, /status: "COMPLETED"/);
  assert.match(dataModelDoc, /Reception accounts can schedule independent bonus classes/);
});

test("locale selection persists and critical workflows use translated text", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const migration = await readProjectFile(
    "prisma/migrations/20260706090000_add_account_locale/migration.sql",
  );
  const locale = await readProjectFile("src/lib/locale.ts");
  const session = await readProjectFile("src/lib/session.ts");
  const authActions = await readProjectFile("src/app/actions/auth.ts");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const appTopbar = await readProjectFile("src/app/components/app-topbar.tsx");
  const loginPage = await readProjectFile("src/app/login/page.tsx");
  const homePage = await readProjectFile("src/app/page.tsx");
  const accountPage = await readProjectFile("src/app/dashboard/account/page.tsx");
  const globalStyles = await readProjectFile("src/app/globals.css");
  const translations = await readProjectFile("src/lib/translations.ts");
  const adminDashboard = await readProjectFile("src/app/dashboard/page.tsx");
  const teacherClassPage = await readProjectFile(
    "src/app/dashboard/classes/[classId]/page.tsx",
  );
  const receptionDashboard = await readProjectFile("src/app/reception/page.tsx");
  const adminRecordsPage = await readProjectFile("src/app/admin/records/page.tsx");
  const receptionStudentsPage = await readProjectFile(
    "src/app/reception/students/page.tsx",
  );

  assert.match(schema, /enum AccountLocale\s*{\s*EN\s*PT_BR\s*}/s);
  assert.match(schema, /locale\s+AccountLocale\s+@default\(PT_BR\)/);
  assert.match(migration, /CREATE TYPE "AccountLocale" AS ENUM \('EN', 'PT_BR'\)/);
  assert.match(migration, /ADD COLUMN "locale" "AccountLocale" NOT NULL DEFAULT 'PT_BR'/);
  assert.match(locale, /label: "English",\s*value: "EN"/s);
  assert.match(locale, /label: "Português Brasileiro",\s*value: "PT_BR"/s);
  assert.match(locale, /defaultAccountLocale:\s*AccountLocale\s*=\s*"PT_BR"/);
  assert.match(locale, /defaultUnauthenticatedLocale:\s*AccountLocale\s*=\s*defaultAccountLocale/);
  assert.match(locale, /return accountLocaleOptions\.some\(\(option\) => option\.value === value\)/);

  assert.match(loginPage, /locale\?: string/);
  assert.match(loginPage, /const locale = normalizeAccountLocale\(params\.locale\)/);
  assert.match(loginPage, /const t = getTranslations\(locale\)/);
  assert.match(loginPage, /<header className="auth-topbar">/);
  assert.match(loginPage, /public-locale-toggle/);
  assert.match(loginPage, /const localeHref = \(nextLocale: AccountLocale\)/);
  assert.match(loginPage, /accountLocaleOptions\.map\(\(option\) =>/);
  assert.match(loginPage, /<input name="locale" type="hidden" value=\{locale\} \/>/);
  assert.match(loginPage, /t\("account\.language"\)/);
  assert.match(loginPage, /t\("auth\.signInTitle"\)/);
  assert.match(homePage, /searchParams: Promise/);
  assert.match(homePage, /normalizeAccountLocale\(params\.locale\)/);
  assert.match(homePage, /public-locale-toggle/);
  assert.match(homePage, /localeShortLabel/);
  assert.match(authActions, /const locale = normalizeAccountLocale\(formData\.get\("locale"\)\)/);
  assert.match(authActions, /const loginErrorUrl = \(error: string\) => `\/login\?locale=\$\{locale\}&error=\$\{error\}`/);
  assert.match(authActions, /redirect\(loginErrorUrl\("missing"\)\)/);
  assert.match(authActions, /redirect\(loginErrorUrl\("invalid"\)\)/);
  assert.match(accountPage, /AppTopbar currentUser=\{currentUser\}/);
  assert.match(accountPage, /<select defaultValue=\{currentUser\.locale\} name="locale">/);
  assert.match(accountPage, /accountLocaleOptions\.map\(\(option\) =>/);
  assert.match(accountPage, /form action=\{updateOwnLocaleAction\}/);
  assert.match(accountPage, /name="redirectTo"/);
  assert.match(appTopbar, /form action=\{updateOwnLocaleAction\}/);
  assert.match(appTopbar, /document\.body\.dataset\.theme = formatThemeAttribute\(currentUser\.theme\)/);
  assert.match(globalStyles, /\.auth-topbar/);
  assert.match(globalStyles, /justify-content: flex-end/);
  assert.match(accountPage, /params\.locale === "updated"/);
  assert.match(accountPage, /t\("account\.languageUpdated"\)/);
  assert.match(accountActions, /export async function updateOwnLocaleAction\(formData: FormData\)/);
  assert.match(accountActions, /where: \{ id: currentUser\.id \}/);
  assert.match(accountActions, /locale: normalizeAccountLocale\(formData\.get\("locale"\)\)/);
  assert.match(accountActions, /readSafeRedirectPath\(formData\.get\("redirectTo"\)\)/);
  assert.match(accountActions, /locale:\s*defaultAccountLocale/);
  assert.match(session, /locale: true/);

  assert.match(translations, /EN:\s*{/);
  assert.match(translations, /PT_BR:\s*{/);
  assert.match(translations, /"account\.languageUpdated"/);
  assert.match(translations, /"dashboard\.teacherWorkflows"/);
  assert.match(translations, /"adminReview\.submittedRecordsTitle"/);
  assert.match(translations, /"receptionLookup\.studentResults"/);
  assert.match(adminDashboard, /const t = getTranslations\(currentUser\.locale\)/);
  assert.match(adminDashboard, /t\("dashboard\.adminDashboard"\)/);
  assert.match(adminDashboard, /t\("dashboard\.teacherWorkflows"\)/);
  assert.match(teacherClassPage, /const t = getTranslations\(currentUser\.locale\)/);
  assert.match(teacherClassPage, /t\("label\.recentLessons"\)/);
  assert.match(teacherClassPage, /formatWeekdays\(schoolClass\.weekDays, currentUser\.locale\)/);
  assert.match(adminRecordsPage, /const t = getTranslations\(currentUser\.locale\)/);
  assert.match(adminRecordsPage, /t\("adminReview\.submittedRecordsTitle"\)/);
  assert.match(receptionDashboard, /const t = getTranslations\(currentUser\.locale\)/);
  assert.match(receptionDashboard, /t\("dashboard\.receptionDashboard"\)/);
  assert.match(receptionStudentsPage, /const t = getTranslations\(currentUser\.locale\)/);
  assert.match(receptionStudentsPage, /t\("receptionLookup\.studentResults"\)/);
});

test("personal slot bookings share three-booth capacity and deduplicate paid time", async () => {
  const [schema, actions, slots, work, staffCalendar, teacherCalendar, dashboard, topbar, translations, personalPage, personalRedirect, picker] = await Promise.all([
    readProjectFile("prisma/schema.prisma"), readProjectFile("src/app/actions/personal-slots.ts"), readProjectFile("src/lib/personal-slots.ts"), readProjectFile("src/lib/teacher-work.ts"), readProjectFile("src/app/components/staff-calendar-page.tsx"), readProjectFile("src/app/dashboard/calendar/page.tsx"),
    readProjectFile("src/app/dashboard/page.tsx"), readProjectFile("src/app/components/app-topbar.tsx"), readProjectFile("src/lib/translations.ts"),
    readProjectFile("src/app/reception/personal-slots/page.tsx"), readProjectFile("src/app/dashboard/personal-slots/page.tsx"), readProjectFile("src/app/admin/classes/roster-picker.tsx"),
  ]);
  assert.match(schema, /model PersonalSlotBooking/);
  assert.match(actions, /requirePersonalSlotManager/);
  assert.match(actions, /confirmPersonalSlotBookingAction/);
  assert.match(actions, /teacher\.id/);
  assert.match(slots, /hasPersonalSlotCapacityConflict/);
  assert.match(slots, /> 3/);
  assert.match(work, /mergedIntervalMinutes/);
  assert.match(work, /personalSlotMinutes/);
  assert.match(staffCalendar, /PERSONAL_SLOT/);
  assert.match(teacherCalendar, /PERSONAL_SLOT/);
  assert.match(teacherCalendar, /collapseOverlaps/);
  assert.match(teacherCalendar, /\/dashboard\?dateFilter=date&date=/);
  assert.match(dashboard, /DateInput/);
  assert.match(dashboard, /dateFilter/);
  assert.match(dashboard, /personalSlotBooking\.findMany/);
  assert.match(dashboard, /confirmPersonalSlotBookingAction/);
  assert.match(dashboard, /formatStartTime\(card\.startTime\)/);
  assert.match(dashboard, /selectedDateWeekday === "SUNDAY"/);
  assert.match(dashboard, /name="returnDate"/);
  assert.match(dashboard, /reception\/personal-slots/);
  assert.doesNotMatch(topbar, /href: "\/dashboard\/personal-slots"/);
  assert.match(topbar, /personalSlots\.title/);
  assert.match(translations, /"personalSlots\.capacityError"/);
  assert.match(translations, /As três cabines estão ocupadas/);
  assert.match(personalPage, /selectionName="studentId"/);
  assert.match(personalPage, /singleSelection/);
  assert.match(personalRedirect, /redirect\(`/);
  assert.match(picker, /singleSelection && !currentStudentIds\.has/);
  assert.match(schema, /attendanceConfirmedById/);
  assert.match(schema, /attendanceStatus\s+BonusClassAttendanceStatus/);
  assert.match(translations, /personalSlots\.confirmAttendance/);
  assert.match(translations, /personalSlots\.teacherTitle/);
});

test("account theme selection persists and applies globally", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const migration = await readProjectFile(
    "prisma/migrations/20260708120000_add_account_theme/migration.sql",
  );
  const theme = await readProjectFile("src/lib/theme.ts");
  const session = await readProjectFile("src/lib/session.ts");
  const accountActions = await readProjectFile("src/app/actions/accounts.ts");
  const accountPage = await readProjectFile("src/app/dashboard/account/page.tsx");
  const appLayout = await readProjectFile("src/app/layout.tsx");
  const appTopbar = await readProjectFile("src/app/components/app-topbar.tsx");
  const globalStyles = await readProjectFile("src/app/globals.css");
  const translations = await readProjectFile("src/lib/translations.ts");

  assert.match(schema, /enum AccountTheme\s*{\s*LIGHT\s*DARK\s*}/s);
  assert.match(schema, /theme\s+AccountTheme\s+@default\(LIGHT\)/);
  assert.match(migration, /CREATE TYPE "AccountTheme" AS ENUM \('LIGHT', 'DARK'\)/);
  assert.match(migration, /ADD COLUMN "theme" "AccountTheme" NOT NULL DEFAULT 'LIGHT'/);

  assert.match(theme, /accountThemeOptions/);
  assert.match(theme, /value: "LIGHT"/);
  assert.match(theme, /value: "DARK"/);
  assert.match(theme, /defaultAccountTheme:\s*AccountTheme\s*=\s*"LIGHT"/);
  assert.match(theme, /return accountThemeOptions\.some\(\(option\) => option\.value === value\)/);
  assert.match(theme, /return theme === "DARK" \? "dark" : "light"/);

  assert.match(session, /theme: true/);
  assert.match(appLayout, /getCurrentUser\(\)/);
  assert.match(appLayout, /currentUser\?\.theme \?\? defaultAccountTheme/);
  assert.match(appLayout, /data-theme=\{formatThemeAttribute\(theme\)\}/);
  assert.match(appTopbar, /type AccountTheme/);
  assert.match(appTopbar, /useEffect/);
  assert.match(appTopbar, /document\.body\.dataset\.theme = formatThemeAttribute\(currentUser\.theme\)/);

  assert.match(accountActions, /export async function updateOwnThemeAction\(formData: FormData\)/);
  assert.match(accountActions, /normalizeAccountTheme\(formData\.get\("theme"\)\)/);
  assert.match(accountActions, /redirect\("\/dashboard\/account\?theme=updated"\)/);
  assert.match(accountPage, /accountThemeOptions/);
  assert.match(accountPage, /params\.theme === "updated"/);
  assert.match(accountPage, /name="theme"/);
  assert.match(accountPage, /t\(option\.labelKey\)/);
  assert.match(accountPage, /t\("account\.themeUpdated"\)/);

  assert.match(translations, /"account\.appearance"/);
  assert.match(translations, /"account\.preferredTheme"/);
  assert.match(translations, /"account\.lightMode"/);
  assert.match(translations, /"account\.darkMode"/);
  assert.match(translations, /"account\.saveTheme"/);
  assert.match(globalStyles, /body\[data-theme="dark"\]/);
  assert.match(globalStyles, /\.segmented-control/);
  assert.match(globalStyles, /--danger-soft/);
  assert.match(globalStyles, /--warning-soft/);
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

test("student and class imports preview duplicates and persist audit summaries", async () => {
  const schema = await readProjectFile("prisma/schema.prisma");
  const migration = await readProjectFile(
    "prisma/migrations/20260706180000_add_student_class_imports/migration.sql",
  );
  const importLib = await readProjectFile("src/lib/imports.ts");
  const importActions = await readProjectFile("src/app/actions/imports.ts");
  const studentsPage = await readProjectFile("src/app/admin/students/page.tsx");
  const classesPage = await readProjectFile("src/app/admin/classes/page.tsx");
  const studentImportPage = await readProjectFile(
    "src/app/admin/students/import/page.tsx",
  );
  const classImportPage = await readProjectFile(
    "src/app/admin/classes/import/page.tsx",
  );
  const studentTemplateRoute = await readProjectFile(
    "src/app/admin/students/import/template/route.ts",
  );
  const classTemplateRoute = await readProjectFile(
    "src/app/admin/classes/import/template/route.ts",
  );
  const studentReportRoute = await readProjectFile(
    "src/app/admin/students/import/error-report/route.ts",
  );
  const classReportRoute = await readProjectFile(
    "src/app/admin/classes/import/error-report/route.ts",
  );
  const studentActions = await readProjectFile("src/app/actions/students.ts");
  const newStudentPage = await readProjectFile("src/app/admin/students/new/page.tsx");
  const editStudentPage = await readProjectFile(
    "src/app/admin/students/[studentId]/page.tsx",
  );
  const docs = await readProjectFile("docs/imports.md");
  const dataModelDoc = await readProjectFile("docs/data-model.md");
  const translations = await readProjectFile("src/lib/translations.ts");

  assert.match(schema, /enum ImportBatchType/);
  assert.match(schema, /STUDENT/);
  assert.match(schema, /CLASS/);
  assert.match(schema, /enum ImportRowStatus/);
  assert.match(schema, /VALID/);
  assert.match(schema, /FAILED/);
  assert.match(schema, /DUPLICATE/);
  assert.match(schema, /CREATED/);
  assert.match(schema, /model ImportBatch/);
  assert.match(schema, /createdCount\s+Int\s+@default\(0\)/);
  assert.match(schema, /skippedCount\s+Int\s+@default\(0\)/);
  assert.match(schema, /duplicatedCount\s+Int\s+@default\(0\)/);
  assert.match(schema, /failedCount\s+Int\s+@default\(0\)/);
  assert.match(schema, /model ImportRow/);
  assert.match(schema, /rawRow\s+Json/);
  assert.match(schema, /normalizedRow\s+Json/);
  assert.match(schema, /errors\s+String\[\]/);
  assert.match(schema, /warnings\s+String\[\]/);
  assert.match(schema, /enrollmentIdentifier\s+String\?\s+@unique/);
  assert.match(migration, /CREATE TYPE "ImportBatchType"/);
  assert.match(migration, /ALTER TABLE "Student" ADD COLUMN "enrollmentIdentifier"/);
  assert.match(migration, /CREATE TABLE "ImportBatch"/);
  assert.match(migration, /CREATE TABLE "ImportRow"/);

  assert.match(importLib, /export function parseCsv/);
  assert.match(importLib, /readAliasedValue/);
  assert.match(importLib, /parseActiveStatus/);
  assert.match(importLib, /buildStudentTemplateCsv/);
  assert.match(importLib, /full_name/);
  assert.match(importLib, /"nome"/);
  assert.match(importLib, /"situação"/);
  assert.match(importLib, /enrollment_identifier/);
  assert.match(importLib, /buildClassTemplateCsv/);
  assert.match(importLib, /teacher_email/);
  assert.match(importLib, /teacher_name/);
  assert.match(importLib, /"professor"/);
  assert.match(importLib, /"estagio"/);
  assert.match(importLib, /"modalidade"/);
  assert.match(importLib, /parsePortugueseSchedule/);
  assert.match(importLib, /parseTimeRange/);
  assert.match(importLib, /portugueseWeekdayMap/);
  assert.match(importLib, /parseTermFromText/);
  assert.match(importLib, /\/0\?\(\[12\]\)/);
  assert.match(importLib, /Object\.values\(values\)\.every/);
  assert.match(importLib, /class_type/);
  assert.match(importLib, /start_time/);
  assert.match(importLib, /parseClassType/);
  assert.match(importLib, /parseStartTime/);
  assert.match(importLib, /REGULAR/);
  assert.match(importLib, /duration_minutes/);
  assert.match(importLib, /week_days/);
  assert.match(importLib, /MONDAY;WEDNESDAY/);
  assert.match(importLib, /previewStudentImport/);
  assert.match(importLib, /Duplicate full_name in this file/);
  assert.match(importLib, /Duplicate enrollment_identifier in this file/);
  assert.match(importLib, /A student with this full_name already exists/);
  assert.match(importLib, /A student with this enrollment_identifier already exists/);
  assert.match(importLib, /previewClassImport/);
  assert.match(importLib, /teacher_email or Professor must match an active teacher account/);
  assert.match(importLib, /class_type must be REGULAR, VIP, PERSONAL, or blank/);
  assert.match(importLib, /start_time must use HH:MM or be blank/);
  assert.match(importLib, /duration_minutes must be an integer from 1 to 600/);
  assert.match(importLib, /week_days must include at least one valid weekday/);
  assert.match(importLib, /Duplicate class name\/book\/semester\/year\/teacher combination/);
  assert.match(importLib, /confirmStudentImport/);
  assert.match(importLib, /confirmClassImport/);
  assert.match(importLib, /acceptedRowIds/);
  assert.match(importLib, /acceptedRowIdSet/);
  assert.match(importLib, /updateStudentImportRow/);
  assert.match(importLib, /updateClassImportRow/);
  assert.match(importLib, /readManualWeekdays/);
  assert.match(importLib, /status: "CREATED"/);
  assert.match(importLib, /skippedCount: rows\.length - createdCount/);
  assert.match(importLib, /buildImportErrorReportCsv/);
  assert.match(importLib, /errors\.join\("; "\)/);
  assert.match(importLib, /warnings\.join\("; "\)/);

  assert.match(importActions, /previewStudentImportAction/);
  assert.match(importActions, /confirmStudentImportAction/);
  assert.match(importActions, /updateStudentImportRowAction/);
  assert.match(importActions, /previewClassImportAction/);
  assert.match(importActions, /confirmClassImportAction/);
  assert.match(importActions, /getAll\("acceptedRowIds"\)/);
  assert.match(importActions, /updateClassImportRowAction/);
  assert.match(importActions, /formData\.getAll\("weekDays"\)/);
  assert.match(importActions, /currentUser\.role !== "ADMIN"/);
  assert.match(importActions, /file instanceof File/);
  assert.match(importActions, /\/admin\/students\/import\?batchId=/);
  assert.match(importActions, /\/admin\/classes\/import\?batchId=/);

  assert.match(studentsPage, /\/admin\/students\/import/);
  assert.match(studentsPage, /imports\.importStudents/);
  assert.doesNotMatch(studentsPage, /enrollmentIdentifier: true/);
  assert.match(classesPage, /\/admin\/classes\/import/);
  assert.match(classesPage, /imports\.importClasses/);
  assert.match(studentImportPage, /previewStudentImportAction/);
  assert.match(studentImportPage, /confirmStudentImportAction/);
  assert.match(studentImportPage, /getViewMode/);
  assert.match(studentImportPage, /acceptedRowIds/);
  assert.match(studentImportPage, /imports\.acceptSelectedStudents/);
  assert.match(studentImportPage, /updateStudentImportRowAction/);
  assert.match(studentImportPage, /imports\.readyRows/);
  assert.match(studentImportPage, /imports\.saveRow/);
  assert.match(studentImportPage, /\/admin\/students\/import\/template/);
  assert.match(studentImportPage, /\/admin\/students\/import\/error-report\?batchId=/);
  assert.match(studentImportPage, /batch\.createdCount/);
  assert.match(studentImportPage, /batch\.skippedCount/);
  assert.match(studentImportPage, /batch\.duplicatedCount/);
  assert.match(studentImportPage, /batch\.failedCount/);
  assert.match(studentImportPage, /imports\.recentImports/);
  assert.match(studentImportPage, /formatShortDateTime/);
  assert.match(classImportPage, /previewClassImportAction/);
  assert.match(classImportPage, /confirmClassImportAction/);
  assert.match(classImportPage, /getViewMode/);
  assert.match(classImportPage, /acceptedRowIds/);
  assert.match(classImportPage, /imports\.acceptSelectedRows/);
  assert.match(classImportPage, /imports\.readyRows/);
  assert.match(classImportPage, /\/admin\/classes\/import\/template/);
  assert.match(classImportPage, /\/admin\/classes\/import\/error-report\?batchId=/);
  assert.match(classImportPage, /adminClasses\.classType/);
  assert.match(classImportPage, /label\.startTime/);
  assert.match(classImportPage, /activeTeachers/);
  assert.match(classImportPage, /imports\.saveRow/);
  assert.match(classImportPage, /imports\.recentImports/);
  assert.match(classImportPage, /formatShortDateTime/);

  for (const source of [
    studentTemplateRoute,
    classTemplateRoute,
    studentReportRoute,
    classReportRoute,
  ]) {
    assert.match(source, /getCurrentUser/);
    assert.match(source, /currentUser\.role !== "ADMIN"/);
    assert.match(source, /Content-Type": "text\/csv; charset=utf-8"/);
  }
  assert.match(studentReportRoute, /status: \{ in: \["FAILED", "DUPLICATE"\] \}/);
  assert.match(classReportRoute, /status: \{ in: \["FAILED", "DUPLICATE"\] \}/);

  assert.match(studentActions, /enrollmentIdentifier/);
  assert.match(studentActions, /error=duplicate/);
  assert.doesNotMatch(newStudentPage, /adminStudents\.enrollmentIdentifier/);
  assert.match(editStudentPage, /adminStudents\.enrollmentIdentifier/);
  assert.match(translations, /imports\.studentImportTitle/);
  assert.match(translations, /imports\.classImportTitle/);
  assert.match(translations, /adminStudents\.duplicateIdentifierError/);
  assert.match(docs, /Student Import Template/);
  assert.match(docs, /Class Import Template/);
  assert.match(docs, /failed rows by default/);
  assert.match(docs, /Submit selected classes/);
  assert.match(docs, /Students\.csv/);
  assert.match(docs, /Classes\.csv/);
  assert.match(docs, /Horario/);
  assert.match(docs, /Professor/);
  assert.match(docs, /Duplicate detection checks normalized full names/);
  assert.match(docs, /name, book, semester, year, and teacher combination/);
  assert.match(dataModelDoc, /ImportBatch/);
  assert.match(dataModelDoc, /ImportRow/);
});
