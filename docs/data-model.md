# Data Model Notes

## Purpose

The first data model captures the school's local class-record workflow.

Teachers, classes, students, lessons, attendance, and homework are stored in the app database.
Grades are stored against each student within a class.
Teacher work summaries combine submitted lessons with manually entered paid activity logs.

## Main Tables

- `User`: login account for admins, teachers, and reception staff, including date-format, locale, theme, and active-status preferences.
- `PasswordResetToken`: hashed, expiring password-reset token linked to a user.
- `Class`: a school class assigned to one teacher, with type, book, semester, year, schedule, and active status.
- `Student`: a learner who can be enrolled in one or more classes.
- `Enrollment`: the connection between a student and a class.
- `Lesson`: one named class session on a specific date.
- `AttendanceRecord`: one student's attendance status for one lesson.
- `HomeworkRecord`: one student's homework status for one lesson.
- `PartialEvaluationGrade`: one student's partial evaluation grade for the 7th or 23rd class.
- `TestGrade`: one student's Mid-term or Final test grade.
- `StudentRiskResolution`: an admin's resolution marker for a student/class risk row.
- `TeacherWorkLog`: one paid non-class activity counted for a teacher's monthly work summary.
- `TeacherWorkLogStudent`: a student attached to a teacher work-log entry.
- `BonusClass`: one independently scheduled bonus class assigned to a teacher.
- `ImportBatch`: one admin CSV import preview or confirmed import, with audit-friendly summary counts.
- `ImportRow`: one uploaded CSV row with normalized data, validation errors, duplicate warnings, and the created record id when imported.

## Important Rules

- A class belongs to one teacher for the first version.
- Classes can be regular, VIP, or personal. VIP and personal classes have one active roster student.
- A teacher cannot have overlapping regular or VIP classes. Personal classes can overlap other personal classes for up to three distinct students.
- Teachers only see active assigned classes.
- Admins can keep inactive classes for historical record review.
- A student can be enrolled in multiple classes.
- A student can optionally have one unique enrollment identifier for import duplicate detection.
- A named lesson is unique per class, lesson date, and lesson name. The class-record form requires a lesson name, so a class can have multiple named lessons on the same date.
- A student can have only one attendance record per lesson.
- A student can have only one homework record per lesson.
- A student can have only one partial evaluation grade per class and partial period.
- A student can have only one test grade per class and test period.
- A bonus class overlapping a regular class schedule should produce a warning and may be explicitly saved; overlapping bonus classes remain rejected. This is a workflow rule, not a database uniqueness rule.
- Letter grades use `D-`, `D`, `D+`, `C-`, `C`, `C+`, `B-`, `B`, `B+`, `A-`, and `A`; there is no `A+`.
- Partial evaluations happen on the 7th and 23rd class.
- Test grades are split into Mid-term and Final periods.
- Each test grade has an oral letter grade, a composition score from 0 to 2, and a written test score from 0 to 8.
- The test total is calculated as composition plus written test, from 0 to 10.
- Submitted records stay in the app database and can be reviewed by admins.
- Submitted lessons count toward the class teacher's monthly work summary using the class duration.
- Substitute lesson records store the primary class teacher separately from the teacher who taught the lesson.
- Substitute lesson attendance and homework are saved immediately, but substitute hours only count after admin approval.
- Paid work outside regular submitted lessons is stored as a teacher work log.
- Teacher work logs store category, title, optional subject, date, optional start time, duration, notes, counted teacher, and creator.
- Bonus class work logs require a subject so monthly summaries show what the class covered.
- Work log categories are bonus class, extra activity, meeting, and other.
- Reception accounts can schedule independent bonus classes with student, subject, teacher, date, start time, duration, and notes.
- Scheduled bonus classes cannot overlap another non-canceled bonus class for the same teacher on the same date.
- Reception accounts can use separate student and class lookup pages for parent-facing questions. Student lookup shows active class context, absences, and grades by class; class lookup shows teacher, schedule, roster, and recent submitted lessons.
- Bonus class scheduling includes a day calendar with 30-minute time rows and one column per teacher.
- Bonus class attendance can be confirmed as present, absent, or excused by the assigned teacher, reception, or admin.
- Completed scheduled bonus classes count toward the assigned teacher's monthly work summary.
- Student and class imports are previewed before confirmation. Invalid rows are not written, duplicate rows are skipped by default, and batch summaries keep created, skipped, duplicated, and failed counts.

## Teacher Work Summaries

Teacher monthly work summaries are computed from three sources:

- Submitted regular lessons during the month.
- Completed scheduled bonus classes during the month.
- Manual teacher work logs during the month.

Regular lessons count automatically for the class's assigned teacher. Approved substitute lessons count for the teacher stored on the lesson as `taughtBy`; pending substitute lessons are visible in summaries but excluded from finalized totals.

Teachers can add their own paid activities. Admins can review all teacher summaries and add activity records for a teacher when corrections are needed.

## Substitute Lessons

Teachers can submit a substitute lesson for another teacher's active class from the dashboard. The lesson stores:

- The primary class teacher through `Class.teacherId`.
- The teacher who submitted the record through `Lesson.submittedById`.
- The teacher who taught and may be paid through `Lesson.taughtById`.
- The payroll approval state through `Lesson.substitutionStatus`.

Substitute records start as `PENDING_APPROVAL`. Admins can approve or reject them from the substitution review page. Approval affects payroll attribution only; attendance and homework records remain saved either way.

## Risk Review

The admin risk review report combines submitted lesson attendance/homework signals with saved test-grade signals. Admins can mark a student/class risk row as resolved; that stores the latest resolved lesson date so future lesson signals only count submitted records after that point.

Default thresholds are kept in `src/app/admin/risk/page.tsx` so they can be adjusted in one place:

- 4 incomplete homework records.
- 4 missed classes.
- 2 missed classes in a row.
- Test total below 7 out of 10.
- Oral grade of C or below.

Only `ABSENT` attendance records count as missed classes by default. `EXCUSED` and `LATE` records stay visible in class records but do not count toward the risk report thresholds.

## Open Questions

- Which Hostinger mailbox/sender address and SMTP credentials should production use?
- What backup retention and off-VPS storage policy will production use?
- What warning wording and confirmation UX should the regular-class overlap warning use?
