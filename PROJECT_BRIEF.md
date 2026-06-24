# Project Brief: Integracao Sponte

## Summary

Integracao Sponte is a web platform for an ESL school where teachers can log in, choose their classes, record attendance and homework completion, and later sync those records to Sponte through the official API.

The first version will store teachers, classes, students, attendance, and homework records locally. Sponte API integration will be added after credentials are available and the API workflow is validated.

## Problem

Teachers currently record attendance and homework completion on paper class records. Someone later has to manually transfer that information into Sponte. This creates duplicate work, delays, and opportunities for mistakes.

## Users

- Teacher: records attendance and homework completion for assigned classes.
- Admin: manages teachers, classes, students, and reviews sync status.
- Future coordinator role: reviews submitted records before syncing to Sponte, if the school needs approval.

## Goals

- Let each teacher access only their own classes.
- Make attendance and homework entry fast enough to use during or immediately after class.
- Save submitted records locally before any external sync.
- Prepare the data model for Sponte integration.
- Add clear sync logs when the Sponte API is connected.

## Non-Goals for Version 1

- Automatic import from Sponte before credentials are available.
- Mobile app store release.
- Payroll, grading, financial, or CRM features.
- Complex permissions beyond teacher and admin.
- Real-time classroom communication.

## First Version Scope

- Email/password login.
- Manual creation of teachers, classes, and students.
- Teacher dashboard with assigned classes.
- Attendance record entry.
- Homework completion entry.
- Local database persistence.
- Admin view for records and future sync status.
- Sponte API notes and integration spike.

## Technical Direction

Recommended stack:

- Next.js with TypeScript for the web app.
- PostgreSQL for the database.
- Prisma for database access.
- Credentials-based authentication for the first version.
- Later deployment target: Vercel or another simple Node-compatible host.

## Key Risks

- Sponte API behavior may require credentials before full endpoint testing.
- Attendance and homework concepts in Sponte may not map one-to-one with the school's paper workflow.
- Teacher accounts and class assignments need careful access control.
- Sync failures must never erase local teacher submissions.

## Success Criteria

- A teacher can log in and submit attendance/homework for a manually created class.
- An admin can see submitted records.
- The app stores enough local data to later sync records to Sponte.
- Failed or unavailable Sponte sync does not block teachers from recording class data.
