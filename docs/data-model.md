# Data Model Notes

## Purpose

The first data model captures the school's local class-record workflow.

Teachers, classes, students, lessons, attendance, and homework are stored in the app database.
Grades are stored against each student within a class.

## Main Tables

- `User`: login account for admins and teachers.
- `Class`: a school class assigned to one teacher, with book, semester, year, and active status.
- `Student`: a learner who can be enrolled in one or more classes.
- `Enrollment`: the connection between a student and a class.
- `Lesson`: one named class session on a specific date.
- `AttendanceRecord`: one student's attendance status for one lesson.
- `HomeworkRecord`: one student's homework status for one lesson.
- `PartialEvaluationGrade`: one student's partial evaluation grade for the 7th or 23rd class.
- `TestGrade`: one student's Mid-term or Final test grade.

## Important Rules

- A class belongs to one teacher for the first version.
- Teachers only see active assigned classes.
- Admins can keep inactive classes for historical record review.
- A student can be enrolled in multiple classes.
- A class can have only one lesson record for the same date.
- A student can have only one attendance record per lesson.
- A student can have only one homework record per lesson.
- A student can have only one partial evaluation grade per class and partial period.
- A student can have only one test grade per class and test period.
- Letter grades use `D-`, `D`, `D+`, `C-`, `C`, `C+`, `B-`, `B`, `B+`, `A-`, and `A`; there is no `A+`.
- Partial evaluations happen on the 7th and 23rd class.
- Test grades are split into Mid-term and Final periods.
- Each test grade has an oral letter grade, a composition score from 0 to 2, and a written test score from 0 to 8.
- The written total is calculated as composition plus written test, from 0 to 10.
- Submitted records stay in the app database and can be reviewed by admins.

## Risk Review

The admin risk review report is computed from submitted class records. Admins can mark a student/class risk row as resolved; that stores the latest resolved lesson date so future reports only count submitted records after that point.

Default thresholds are kept in `src/app/admin/risk/page.tsx` so they can be adjusted in one place:

- 3 incomplete homework records.
- 3 missed classes.
- 2 missed classes in a row.

Only `ABSENT` attendance records count as missed classes by default. `EXCUSED` and `LATE` records stay visible in class records but do not count toward the risk report thresholds.

## Future Questions

- Should substitute teachers be supported with a separate assignment table?
- Should admin approval be required before a lesson becomes final?
- What export format would be most useful for school records?
