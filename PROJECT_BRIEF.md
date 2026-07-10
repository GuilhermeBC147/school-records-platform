# Project Brief: School Records Platform

## Summary

School Records Platform is a web platform for an ESL school where staff can log in and manage class records, students, grades, risk signals, scheduling, and teacher work summaries digitally.

The app stores users, classes, students, enrollments, lessons, attendance, homework, grades, scheduling, imports, and work-summary records in its own database.

## Problem

Teachers currently record attendance and homework completion on paper class records. This creates storage problems, delays, and opportunities for mistakes when staff need to review class information later.

## Users

- Teacher: records attendance and homework completion for assigned classes.
- Admin: manages teacher and reception accounts, classes, students, rosters, grades, imports, and reviews submitted records.
- Reception: schedules independent bonus classes and assigns them to available teachers.
- Future coordinator role: reviews submitted records, if the school needs approval.

## Goals

- Let each teacher access only their own classes.
- Make attendance and homework entry fast enough to use during or immediately after class.
- Save submitted records in a reliable database.
- Make records searchable and reviewable by admins.
- Reduce paper-based class record handling.

## Non-Goals for Version 1

- External school-system connections.
- Mobile app store release.
- Financial billing, invoicing, or CRM features.
- Complex permissions beyond teacher, admin, and reception.
- Real-time classroom communication.

## First Version Scope

- Email/password login.
- Forgot password and reset password flow.
- Manual creation and CSV import of classes and students.
- Admin account management for teachers and reception staff, including password recovery support.
- Admin class setup with teacher assignment, book, semester, year, and active status.
- Regular, VIP, and personal class types with optional weekday/time scheduling.
- Admin class roster setup with enrolled students.
- Teacher dashboard with assigned classes.
- Attendance record entry.
- Homework completion entry.
- Partial evaluations and Mid-term/Final test grades.
- Admin risk review for attendance, homework, and grade signals.
- Local database persistence.
- Admin view for records.
- Search and filtering for classes, students, and lesson records.
- Monthly teacher work summaries for payroll counting.
- Independent bonus class scheduling by reception.
- Substitute teacher tracking for lessons taught by someone other than the class's primary teacher.
- Extra activity records for paid school events or activities.
- English/Brazilian Portuguese localization and account date-format/theme preferences.

## Technical Direction

Recommended stack:

- Next.js with TypeScript for the web app.
- PostgreSQL for the database.
- Prisma for database access.
- Credentials-based authentication is implemented with signed sessions and an `AUTH_SECRET`.
- Deployment target remains open; the app is designed for a hosted PostgreSQL database and a Node-compatible host.

## Key Risks

- Teacher accounts and class assignments need careful access control.
- Password reset needs a production-ready email path before school use.
- Admin setup screens need enough validation to avoid broken class rosters.
- Reception scheduling needs conflict checks to avoid assigning one teacher to two sessions at the same time.
- The current bonus-class conflict check covers overlapping non-canceled bonus classes; overlap with regular class schedules still needs an explicit decision and implementation.
- Payroll counts need to distinguish the teacher who submitted a record from the teacher who should be paid for it.
- The app needs a clear backup/export strategy before production use.
- The current workflow tests are static source checks; browser and production database checks are still needed.

## Success Criteria

- A teacher can log in and submit attendance/homework for a manually created class.
- A teacher can recover account access through a password reset flow.
- An admin can create teacher accounts, classes, and class rosters.
- An admin can see submitted records.
- Submitted records are stored and reviewable in the app.
- Admins can manage the school data needed for normal class record workflows.
- Reception can schedule bonus classes without double-booking teachers.
- Admins can review monthly teacher work counts for lessons, substitutions, bonus classes, and extra activities.
- Admins can import students and classes with validation and duplicate warnings.
- Staff can use the supported language, date-format, and theme preferences.
