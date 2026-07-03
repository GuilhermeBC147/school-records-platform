# Project Brief: Class Records Platform

## Summary

Class Records Platform is a web platform for an ESL school where teachers can log in, choose their classes, and record attendance and homework completion digitally.

The app will store teachers, classes, students, attendance, and homework records in its own database.

## Problem

Teachers currently record attendance and homework completion on paper class records. This creates storage problems, delays, and opportunities for mistakes when staff need to review class information later.

## Users

- Teacher: records attendance and homework completion for assigned classes.
- Admin: manages teacher accounts, classes, students, rosters, and reviews submitted records.
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
- Payroll, grading, financial, or CRM features.
- Complex permissions beyond teacher and admin.
- Real-time classroom communication.

## First Version Scope

- Email/password login.
- Forgot password and reset password flow.
- Manual creation of teachers, classes, and students.
- Admin class setup with teacher assignment, book, semester, year, and active status.
- Admin class roster setup with enrolled students.
- Teacher dashboard with assigned classes.
- Attendance record entry.
- Homework completion entry.
- Local database persistence.
- Admin view for records.
- Search and filtering for classes, students, and lesson records.

## Technical Direction

Recommended stack:

- Next.js with TypeScript for the web app.
- PostgreSQL for the database.
- Prisma for database access.
- Credentials-based authentication for the first version.
- Later deployment target: Vercel or another simple Node-compatible host.

## Key Risks

- Teacher accounts and class assignments need careful access control.
- Password reset needs a production-ready email path before school use.
- Admin setup screens need enough validation to avoid broken class rosters.
- The app needs a clear backup/export strategy before production use.

## Success Criteria

- A teacher can log in and submit attendance/homework for a manually created class.
- A teacher can recover account access through a password reset flow.
- An admin can create teacher accounts, classes, and class rosters.
- An admin can see submitted records.
- Submitted records are stored and reviewable in the app.
- Admins can manage the school data needed for normal class record workflows.
