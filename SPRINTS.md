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
- `sprint-15-production-readiness`

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
- Prevent bonus classes from overlapping with regular class schedules for the same teacher when schedule data is available.
- Let reception assign or reassign the teacher before the bonus class happens.
- Let the assigned teacher record or confirm that the bonus class happened.
- Keep teacher-created bonus classes from the dashboard Add event flow aligned with reception-created bonus classes, including subject, date, start time, duration, and notes.
- Add a reception student lookup for parent-facing questions, including last attended lesson, missed lessons, missed-class count, incomplete-homework count, and active class information.
- Add a reception class lookup so reception can quickly confirm class teacher, schedule, roster, and recent lessons.
- Show bonus classes in a calendar-style day grid with 30-minute rows and one column per teacher.
- Count completed bonus classes toward the assigned teacher's monthly paid work.

Suggested commits:

- `feat: add reception accounts`
- `feat: add bonus class scheduling`
- `fix: prevent teacher schedule conflicts`

Done when:

- Reception can schedule bonus classes and assign teachers.
- Reception cannot access admin-only or teacher-only management areas.
- The app blocks teacher double-booking for bonus classes.
- Reception can answer student and class schedule questions without admin access.
- Reception can visually scan a teacher-by-time bonus class calendar.
- Completed bonus classes appear in teacher monthly work summaries.
- Teacher-created bonus classes capture the same scheduling details as reception-created bonus classes.

## Sprint 15: Production Readiness

Goal: prepare the app for school-owned hosting and day-to-day use.

Tasks:

- Add production environment checklist.
- Add hosted PostgreSQL setup notes.
- Add backup/export routine.
- Add basic monitoring/logging guidance.
- Add tests for critical teacher, grading, account, and admin review workflows.
- Confirm exports still include the records the school needs after grading, risk review, bonus classes, substitutions, and teacher work summaries are added.
- Add backup guidance for grades, risk-review data, bonus classes, substitutions, and teacher work summaries.
- Add tests for reception scheduling permissions and teacher double-booking prevention.
- Add tests for substitution payroll counts and extra activity approval.

Suggested commits:

- `docs: add production setup checklist`
- `test: cover critical school workflows`

Done when:

- The school has a clear handoff checklist.
- Critical workflows are tested.
