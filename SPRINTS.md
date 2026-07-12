# Current Handoff

Last updated: 2026-07-12

## Current focus

Continue Sprint 19 with the focused production Hostinger SMTP password-reset delivery change, then have the school complete its external VPS/DNS/backup/alert provisioning and real restore rehearsal using the new operator runbook.

## Current implementation status

- Core class records, accounts, classes, students, grades, risk review, teacher work summaries, substitutions, reception workflows, localization, and imports are present in the current source.
- Sprint 17 localization and Sprint 18 student/class imports are implemented and covered by the current critical-workflow checks.
- Account theme preferences were added after the Sprint 18 plan and are implemented.
- Role navigation has been streamlined: the shared top bar now exposes each role's primary routes with a visible horizontal-overflow affordance; admins use a core row plus collapsible groups for management, work, operations, and account tools, while signed-in language selection lives in account settings and landing/login language controls are compact and URL-based.
- Role-scoped calendar views are implemented: teachers, admins, and reception can view combined regular classes, bonus classes, and admin-created meetings across a Monday-to-Sunday week, with teachers shown on staff event cards. The admin view shows one card per meeting, and all calendar views keep the weekday header visible while scrolling.
- Personal booth scheduling supports dated review, make-up lesson, test, and other bookings for any active student and teacher. Recurring personal classes and ad-hoc bookings share three-booth capacity, appear in calendars, and overlapping completed personal work counts once in teacher hours.
- Overlapping calendar events now group into expandable cards spanning their combined time range; personal groups show occupancy, and teachers can confirm assigned bookings as Present, Absent, or Excused from date-filtered class cards on the teacher dashboard. The legacy personal-slots path redirects there.
- The Sprint 19 quality-control baseline and scheduling follow-up are documented in `docs/sprint-19-quality-control.md`: 22 workflow assertions, PostgreSQL scheduling coverage, typecheck, Prisma validation, production build, and bilingual create/edit browser checks pass.
- English and Brazilian Portuguese critical-screen browser testing is documented in `docs/sprint-19-bilingual-screen-matrix.md`; all public, admin, teacher, reception, locale-persistence, and reception access-boundary checks passed locally.
- PostgreSQL-backed student and class import testing is documented in `docs/sprint-19-import-quality-control.md`; valid, invalid, duplicate, partial-failure, audit-count, and cleanup scenarios pass twice consecutively.
- Bonus scheduling now hard-blocks overlapping non-canceled bonus classes and warns on active recurring `REGULAR`, `VIP`, or `PERSONAL` class overlaps. Create and edit require an explicit localized save-anyway action, restore the validated proposal after warning, and rerun both conflict checks before writing. Static, PostgreSQL, and bilingual browser checks pass.
- The repository-owned production operations foundation is complete: Caddy/private Compose topology, standalone non-root app/migration images, detail-free health routes, GitHub Actions deployment, restart and app-image rollback guidance, systemd monitoring/backup/rehearsal timers, checksummed `pg_dump` archives, off-VPS `rclone` support, and a beginner operator runbook are in place. PostgreSQL has no public production port and no secrets are committed.
- Local production-stack, migration, health, logical-backup, checksum, temporary-restore, config, source/build, and script checks are recorded in `docs/sprint-19-quality-control.md`. School-owned VPS/DNS/TLS, Hostinger backup, GitHub approval, alert, off-VPS remote, external uptime, and a real restore rehearsal remain external launch work.
- Production SMTP password-reset delivery remains the next focused launch blocker. No SMTP code or dependency was added in the operations foundation.
- The school-facing first-deployment and maintenance guide is available in Brazilian Portuguese at `docs/guia-producao-pt-BR.md`. A one-time interactive bootstrap command creates the first administrator only on an empty production user table; it replaces the unsafe idea of seeding demo users in production.

## Completed workflow decisions

- Use repository documentation as long-term memory.
- Use AGENTS.md for Codex instructions.
- Use codebase-memory-mcp for codebase navigation.
- Use the repository's finding-unknowns-skills package through the `blindspot-pass` skill for larger planning work.
- Keep Context Mode and Ultracode benched for now.

## Known issues / questions

- Production password-reset email delivery still requires a Hostinger SMTP mailbox and configuration.
- The production target is a Hostinger VPS in Brazil; deployment, restart, monitoring, security-update, and backup automation plus an operator runbook still need implementation.
- Layered backup ownership, retention, off-VPS storage, and restore testing still need production confirmation.
- The default `npm test` suite remains source-level; PostgreSQL scheduling/import suites are opt-in, and broader critical-write browser/database coverage is still needed.
- The local seed is not repeatable against an already-populated database and can fail with Prisma `P2002` on duplicate IDs.

## Next recommended task

Add the production environment checklist and concrete Hostinger VPS setup/operations automation: deployment with migrations and restart, HTTPS renewal, security updates, health/resource monitoring, layered backups with failure alerts, and an operator runbook. Keep the non-repeatable seed `P2002` as a separate focused follow-up and do not provision school-owned infrastructure without the required credentials and ownership decisions.

---
# Sprint Plan

## Working Rhythm

Each sprint should produce a small, working increment. Each task should usually become one commit or part of a small commit group.

Branch naming:

- `sprint-0-planning`
- `sprint-1-foundation`
- `sprint-2-data-model`
- `sprint-3-auth-dashboard`
- `sprint-4-class-records`
- `sprint-5-admin-records`
- `sprint-6-account-management`
- `sprint-7-class-management`
- `sprint-8-student-enrollments`
- `sprint-9-record-cleanup`
- `sprint-10-grading-model`
- `sprint-11-teacher-grades`
- `sprint-12-admin-risk-review`
- `sprint-13-teacher-work-log`
- `sprint-14-bonus-scheduling`
- `sprint-15-admin-teacher-workflow-adjustments`
- `sprint-16-consistency-pass`
- `sprint-17-localization`
- `sprint-18-imports`
- `sprint-19-production-readiness`

Commit style:

- `docs: add project brief`
- `chore: scaffold next app`
- `feat: add teacher login`
- `fix: prevent duplicate attendance submission`
- `test: cover class record submission`

## Sprint 0: Planning and Setup

Goal: create a clear roadmap and prepare the repository.

Tasks:

- Write project brief.
- Write sprint plan.
- Create initial backlog.
- Capture product assumptions and open questions.
- Confirm local Git/GitHub workflow.
- Choose initial tech stack.

Suggested commits:

- `docs: add project planning notes`
- `docs: document product assumptions`

Done when:

- The repository explains what the project is.
- The next sprint has concrete implementation tasks.
- Product uncertainty is captured instead of hidden.

## Sprint 1: Application Foundation

Goal: create the first runnable web app.

Tasks:

- Scaffold a Next.js TypeScript project.
- Add linting and formatting.
- Add basic app layout.
- Add environment variable example file.
- Add initial README setup steps.
- Confirm the app runs locally.

Suggested commits:

- `chore: scaffold next app`
- `chore: add environment template`
- `docs: add local setup instructions`

Done when:

- The app starts locally.
- The README explains how to run it.
- The initial homepage identifies the project.

## Sprint 2: Data Model

Goal: model the school workflow locally.

Tasks:

- Add Prisma.
- Configure PostgreSQL connection.
- Create models for users, teachers, classes, students, lessons, attendance records, and homework records.
- Add seed data for one admin, two teachers, sample classes, and students.
- Add simple developer/admin data view.

Suggested commits:

- `feat: add initial database schema`
- `feat: seed sample school data`
- `feat: add basic admin data view`

Done when:

- The database can be created from the schema.
- Seed data can be loaded.
- We can inspect sample teachers, classes, and students in the app.

## Sprint 3: Teacher Login and Dashboard

Goal: teachers can log in and see only their assigned classes.

Tasks:

- Add credentials-based authentication.
- Add login and logout.
- Add session protection for private pages.
- Add teacher dashboard.
- Restrict class visibility by teacher.

Suggested commits:

- `feat: add credentials login`
- `feat: add teacher dashboard`
- `feat: restrict class access by teacher`

Done when:

- A teacher can log in.
- A teacher sees their own assigned classes.
- A teacher cannot access another teacher's class page.

## Sprint 4: Class Records

Goal: teachers can submit attendance and homework completion.

Tasks:

- Add class session page.
- Add attendance checklist.
- Add homework completion checklist.
- Save draft records.
- Submit records.
- Prevent accidental duplicate submissions.
- Add admin review page for submitted records.

Suggested commits:

- `feat: add class record form`
- `feat: save attendance and homework records`
- `feat: add submitted records review`

Done when:

- A teacher can submit a class record.
- Submitted records are stored locally.
- An admin can review submitted records.

## Sprint 5: Admin Records

Goal: help admins find, review, and export submitted records.

Tasks:

- Add submitted records list.
- Add filters by teacher, class, student, and date.
- Add record detail page.
- Add CSV export for class records.
- Add simple backup/export documentation.

Suggested commits:

- `feat: add admin record search`
- `feat: export class records to csv`

Done when:

- Admins can find submitted class records.
- Admins can export records for backup or reporting.

## Sprint 6: Account Management

Goal: admins can manage user accounts and staff can recover access safely.

Tasks:

- Add password reset token model.
- Add forgot password request page.
- Add reset password page.
- Add development-safe password reset flow.
- Document production email provider requirements.
- Add admin teacher account list.
- Add admin create teacher account form.
- Add admin edit teacher account form.
- Add active/inactive teacher account status.
- Prevent inactive users from logging in.

Suggested commits:

- `feat: add password reset flow`
- `feat: add admin teacher management`

Done when:

- A teacher can recover access without a developer editing the database.
- An admin can create and deactivate teacher accounts.
- Inactive accounts cannot log in.

## Sprint 7: Class Management

Goal: admins can create and maintain classes assigned to teachers.

Tasks:

- Add class fields for book, semester, and year.
- Add admin class list.
- Add admin create class form.
- Add admin edit class form.
- Assign a teacher to each class.
- Set class active/inactive status.
- Show only active classes on teacher dashboards.
- Keep inactive classes available to admins for historical records.

Suggested commits:

- `feat: add class metadata`
- `feat: add admin class management`

Done when:

- An admin can create a class with name, book, semester, year, teacher, and active status.
- Teachers only see active assigned classes.
- Admin records remain reviewable for inactive classes.

## Sprint 8: Student and Enrollment Management

Goal: admins can manage students and class rosters.

Tasks:

- Add admin student list.
- Add admin create student form.
- Add admin edit student form.
- Add active/inactive student status controls.
- Add class roster management page.
- Add students to a class.
- Remove or deactivate students from a class roster.
- Ensure inactive students do not appear in new class record forms.

Suggested commits:

- `feat: add admin student management`
- `feat: add class roster management`

Done when:

- An admin can create students.
- An admin can add students to classes.
- Teachers see the current active roster when submitting a class record.

## Sprint 9: Student and Lesson Record Cleanup

Goal: simplify class records before adding grades and reporting.

Tasks:

- Remove preferred name from the student schema.
- Remove preferred name from admin student forms, lists, roster pickers, class pages, record pages, exports, seed data, and tests.
- Add a migration that drops `Student.preferredName`.
- Remove lesson time from the teacher class-record form.
- Store lesson records by class and lesson date only, using one normalized time internally if the database still stores a `DateTime`.
- Update duplicate-record protection to prevent two records for the same class on the same date.
- Update data-model documentation to describe lessons as dated class sessions, not date-and-time sessions.

Suggested commits:

- `feat: remove student preferred names`
- `feat: simplify lesson records to dates`

Done when:

- Admins and teachers only see student full names.
- Teachers enter lesson date but not lesson time.
- A class cannot accidentally create duplicate records for the same date.
- Existing tests and documentation match the simplified model.

## Sprint 10: Grading Data Model

Goal: model the school's partial evaluations and test grades safely.

Tasks:

- Add grade enums for letter grades from `D-`, `D`, `D+` through `A`, with no `A+`.
- Add partial evaluation records for each student in a class.
- Track whether a partial evaluation is for the 7th class or the 23rd class.
- Add test grade records for each student in a class.
- Track two test periods: Mid-term and Final.
- Store oral grade as a letter grade.
- Store composition score as a numeric score from 0 to 2.
- Store written test score as a numeric score from 0 to 8.
- Compute written total as composition plus written test, from 0 to 10.
- Add indexes and uniqueness rules so each student has only one grade record per class, period, and grade type.
- Seed sample grades if helpful for UI development.
- Document grading rules in `docs/data-model.md` or a new grading doc.

Suggested commits:

- `feat: add grading schema`
- `docs: document grading model`

Done when:

- Prisma can validate and generate the new schema.
- The model prevents duplicate partial, mid-term, and final grades for the same student/class.
- The model can represent all required grade components without UI workarounds.

## Sprint 11: Teacher Grade Entry

Goal: teachers can enter and maintain grades for their own active classes.

Tasks:

- Add a Grades area to the teacher class-management page.
- Show enrolled active students in a grade-entry table.
- Add entry/edit UI for 7th-class and 23rd-class partial evaluations.
- Add entry/edit UI for Mid-term and Final test grades.
- Validate letter grades against the allowed scale.
- Validate composition scores between 0 and 2.
- Validate written test scores between 0 and 8.
- Display computed written total out of 10.
- Save grade drafts or updates without affecting attendance/homework records.
- Restrict grade access so teachers can only manage grades for their own classes.
- Add admin read-only visibility for grades if needed for review.

Suggested commits:

- `feat: add teacher grade entry`
- `test: cover grade access rules`

Done when:

- A teacher can open one of their classes and enter all partial and test grades.
- Invalid grade values are rejected.
- Teachers cannot view or edit grades for another teacher's class.

## Sprint 12: Teacher Self-Service and Admin Risk Review

Goal: reduce admin account work and highlight students who need attention.

Tasks:

- Add a logged-in teacher account page.
- Add a change-password form for teachers.
- Require current password before changing to a new password.
- Validate new password length and confirmation.
- Reuse existing password hashing helpers.
- Add an admin review report for student risk signals.
- Flag students with many incomplete homework records.
- Flag students with many total missed classes.
- Flag students with two missed classes in a row.
- Let admins filter the report by class, teacher, and date range.
- Link report rows back to the student's records or relevant class records.
- Document the default thresholds and make them easy to change.

Suggested commits:

- `feat: add teacher password change`
- `feat: add admin student risk report`

Done when:

- Teachers can change their own password while logged in.
- Admins can see students with repeated homework or attendance issues.
- Consecutive absences are detected from submitted lesson records in date order.

## Sprint 13: Teacher Work Log and Monthly Counts

Goal: count the paid work teachers completed each month.

Tasks:

- Add a teacher work-log model for paid non-class work.
- Define paid work categories such as regular lesson, bonus class, event, game night, holiday activity, meeting, and other.
- Store date, start time, duration, description, and counted teacher for each paid work item.
- Count submitted regular class lessons toward the assigned or substitute teacher.
- Add a teacher monthly summary page showing total counted lessons, extra activities, and paid hours.
- Add an admin monthly summary page filtered by teacher and date range.
- Include enough detail for admins to audit which records make up each monthly total.
- Document which records count automatically and which must be added manually.

Suggested commits:

- `feat: add teacher work log model`
- `feat: add monthly teacher work summaries`

Done when:

- Teachers and admins can see a monthly count of paid work.
- Regular lessons and extra activities can both be counted.
- Admins can trace each total back to the underlying records.

## Sprint 14: Bonus Class and Reception Scheduling

Goal: let reception schedule independent bonus classes without double-booking teachers.

Tasks:

- Add a `RECEPTION` user role.
- Restrict reception accounts to bonus-class scheduling screens only.
- Add an independent bonus class/session model separate from regular classes.
- Store student, subject, assigned teacher, date, start time, duration, status, and notes for each bonus class.
- Prevent two bonus classes from being scheduled for the same teacher at overlapping times.
- Warn when a bonus class overlaps a regular class schedule for the same teacher, while allowing an explicit save.
- Let reception assign or reassign the teacher before the bonus class happens.
- Let the assigned teacher record or confirm that the bonus class happened.
- Keep teacher-created bonus classes from the dashboard Add event flow aligned with reception-created bonus classes, including subject, date, start time, duration, and notes.
- Add a reception student lookup for parent-facing questions, including last attended lesson, missed lessons, missed-class count, incomplete-homework count, and active class information.
- Add a reception class lookup so reception can quickly confirm class teacher, schedule, roster, and recent lessons.
- Show regular and bonus classes in a Monday-to-Sunday calendar-style grid with 30-minute rows and teacher details on staff event cards.
- Let teachers, reception, or admins confirm bonus class attendance.
- Split reception tools into focused dashboard, scheduling, calendar, and lookup pages.
- Count completed bonus classes toward the assigned teacher's monthly paid work.

Suggested commits:

- `feat: add reception accounts`
- `feat: add bonus class scheduling`
- `fix: prevent teacher schedule conflicts`

Done when:

- Reception can schedule bonus classes and assign teachers.
- Reception cannot access admin-only or teacher-only management areas.
- The app blocks teacher double-booking between bonus classes.
- The app warns about regular-class conflicts without blocking an explicitly confirmed bonus class.
- Reception can answer student and class schedule questions without admin access.
- Reception can visually scan a teacher-by-time bonus class calendar.
- Bonus calendar entries open to edit details or confirm attendance.
- Completed bonus classes appear in teacher monthly work summaries.
- Teacher-created bonus classes capture the same scheduling details as reception-created bonus classes.

## Sprint 15: Admin and Teacher Workflow Adjustments

Goal: address workflow corrections found after bonus scheduling, before the broader consistency pass.

Tasks:

- Rename admin teacher management to account management, with teacher and reception account creation.
- Move the account management route from `/admin/teachers` to `/admin/manage-accounts`, keeping old routes redirected safely.
- Remove class cards from the admin dashboard because classes are managed from "Manage classes".
- Change admin dashboard wording from "Manage teachers" to "Manage accounts".
- Change "Manage account" links to "Account settings" to avoid confusion with admin account management.
- Improve admin, reception, and teacher dashboards with role-specific overview metrics, workflow cards, and upcoming schedule context.
- Keep teacher dashboards focused on the signed-in account and relevant weekday classes by default.
- Add teacher dashboard filters for classes by day of week.
- Add student-name autocomplete to student search filters.
- Let admins filter risk situations by resolved and unresolved state.
- Let admins undo resolved risk situations in case of accidental clicks.
- Update risk signals to flag 4 or more incomplete homework records.
- Add a risk signal for 4 or more total absences, regardless of whether they are consecutive.
- Let admins create multi-teacher meetings from work summaries and count the duration toward each teacher's monthly hours.
- Keep teachers from creating meeting work logs from their own Add event page.
- Let admins undo approved substitute lessons.
- Show teacher bonus classes in a date-filtered calendar view for attendance updates.
- Confirm displayed dates use `dd/mm/yy` formatting wherever app-rendered dates are shown.
- Update focused workflow tests for these adjustments.

Suggested commits:

- `feat: refine admin account workflows`
- `feat: polish teacher dashboard filters`
- `fix: allow admin undo actions`

Done when:

- Admins manage teacher and reception accounts from `/admin/manage-accounts`.
- The admin dashboard links to management screens without duplicating class cards.
- Admin, reception, and teacher dashboards provide useful at-a-glance status and clear workflow entry points.
- Teacher dashboards show account-specific classes with useful day filtering.
- Student search filters offer student-name autocomplete.
- Risk review supports resolved/unresolved filtering and undoing accidental resolutions.
- Risk rules match the 4 incomplete-homework and 4 total-absence thresholds.
- Admin-created meetings count toward each selected teacher's monthly summary.
- Teachers cannot create meeting work logs from their own Add event page.
- Admins can undo approved substitute lessons.
- Teacher bonus-class attendance is date-filtered and calendar-style.
- Tests cover the adjusted workflows.

## Sprint 16: Consistency Pass and Small Adjustments

Goal: smooth out existing workflows before the final production-readiness pass.

Tasks:

- Review admin, teacher, and reception navigation for consistent return paths, labels, and access boundaries.
- Standardize form wording, validation messages, success messages, and empty states across existing screens.
- Tighten small usability gaps in existing functions without adding major new product scope.
- Check that date, time, duration, status, attendance, homework, grade, and work-summary labels use consistent language.
- Review shared formatting helpers and remove duplicated display logic where it is low-risk.
- Confirm role-specific dashboards expose the right next actions for admins, teachers, and reception.
- Audit recent sprint features for stale generated-client, migration, or seed-data assumptions that could confuse local development.
- Add or update focused tests for any small behavior fixes made during the pass.

Suggested commits:

- `fix: polish workflow consistency`
- `test: cover consistency fixes`

Done when:

- Existing workflows feel consistent across roles.
- Small rough edges found during testing are fixed without expanding scope.
- Tests cover any behavior changes introduced during the pass.

## Sprint 17: Platform Localization

Goal: let users choose between English and Brazilian Portuguese across the platform.

Tasks:

- [x] Add a locale setting for each signed-in user, with English and Brazilian Portuguese options.
- [x] Add a language selector in account settings or another persistent account area.
- [x] Define default locale behavior for new users and unauthenticated pages.
- [x] Extract user-facing labels, navigation text, validation messages, success messages, empty states, and email/password-reset copy into translation resources.
- [x] Localize role-specific admin, teacher, and reception dashboards.
- [x] Localize date, time, duration, status, attendance, homework, grade, risk-review, scheduling, and work-summary wording.
- [x] Confirm CSV/export headers use the selected or documented locale consistently.
- [x] Add fallback handling so missing translation keys are visible during development.
- [x] Add focused tests for locale selection, persistence, and translated critical workflows.

Suggested commits:

- `feat: add platform localization`
- `test: cover locale selection`

Done when:

- Users can choose English or Brazilian Portuguese.
- The selected language persists across sessions.
- Critical admin, teacher, and reception workflows show translated interface text.
- Tests cover language selection and representative translated workflows.

## Sprint 18: Student and Class Imports

Goal: let admins import students and classes while preventing accidental duplicate data.

Tasks:

- Add admin import screens for students and classes.
- Define CSV templates for student imports and class imports.
- Document required and optional columns for each import type.
- Validate imported rows before writing to the database.
- Detect repeated student information such as duplicated names, enrollment identifiers, or other configured unique fields.
- Detect repeated class information such as duplicated class name, book, semester, year, and teacher combinations.
- Show row-level validation errors and duplicate warnings before import confirmation.
- Let admins download an error report for failed rows.
- Import only valid confirmed rows and report skipped or duplicate rows clearly.
- Add audit-friendly import summaries with counts for created, skipped, duplicated, and failed rows.
- Add tests for successful imports, duplicate detection, validation errors, and partial-failure handling.

Suggested commits:

- `feat: add student and class imports`
- `test: cover import duplicate checks`

Done when:

- Admins can import student and class data from documented templates.
- Duplicate or repeated information is detected before records are created.
- Import results clearly explain created, skipped, duplicate, and failed rows.
- Tests cover duplicate detection and import validation behavior.

## Sprint 19: Production Readiness

Goal: prepare the app for school-owned hosting and day-to-day use.

Tasks:

- [x] Run a full quality-control pass across admin, teacher, reception, localization, import, grading, scheduling, risk-review, and reporting workflows. Baseline evidence and remaining runtime checks are recorded in `docs/sprint-19-quality-control.md`.
- [x] Test English and Brazilian Portuguese language selection across critical screens. Local browser evidence is recorded in `docs/sprint-19-bilingual-screen-matrix.md`.
- [x] Test student and class imports with valid files, invalid rows, duplicated data, and partial-failure cases. PostgreSQL evidence is recorded in `docs/sprint-19-import-quality-control.md`.
- [x] Add production environment checklist.
- [x] Add Hostinger VPS-in-Brazil setup notes for the application and PostgreSQL.
- [x] Add automated deployment, restart, HTTPS renewal, security-update, and health/resource monitoring guidance.
- [x] Add backup/export routine.
- [x] Add layered Hostinger-plus-off-VPS PostgreSQL backup guidance, failure alerts, and restore testing.
- [x] Add basic monitoring/logging guidance.
- Add tests for critical teacher, grading, account, and admin review workflows.
- Confirm exports still include the records the school needs after grading, risk review, bonus classes, substitutions, and teacher work summaries are added.
- Add backup guidance for grades, risk-review data, bonus classes, substitutions, and teacher work summaries.
- Add tests for reception scheduling permissions and teacher double-booking prevention.
- Add tests for substitution payroll counts and extra activity approval.
- Confirm all quality-control findings are either fixed or documented as launch blockers/follow-up work.

Suggested commits:

- `docs: add production setup checklist`
- `test: cover critical school workflows`
- `test: complete production quality control`

Done when:

- The school has a clear handoff checklist.
- Critical workflows are tested across roles and supported languages.
- Import, localization, scheduling, grading, risk-review, export, and payroll-related workflows pass quality control.
- Launch blockers are resolved or explicitly documented before handoff.
