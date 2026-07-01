# Data Model Notes

## Purpose

The first data model captures the school's local class-record workflow.

Teachers, classes, students, lessons, attendance, and homework are stored in the app database.

## Main Tables

- `User`: login account for admins and teachers.
- `Class`: a school class assigned to one teacher.
- `Student`: a learner who can be enrolled in one or more classes.
- `Enrollment`: the connection between a student and a class.
- `Lesson`: one dated class session.
- `AttendanceRecord`: one student's attendance status for one lesson.
- `HomeworkRecord`: one student's homework status for one lesson.

## Important Rules

- A class belongs to one teacher for the first version.
- A student can be enrolled in multiple classes.
- A class can have only one lesson per date.
- A student can have only one attendance record per lesson.
- A student can have only one homework record per lesson.
- Submitted records stay in the app database and can be reviewed by admins.

## Future Questions

- Should substitute teachers be supported with a separate assignment table?
- Should teachers be able to edit submitted lessons?
- Should admin approval be required before a lesson becomes final?
- What export format would be most useful for school records?
