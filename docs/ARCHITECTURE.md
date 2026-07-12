# Architecture

Current snapshot: 2026-07-10. The current code and Prisma schema are the source of truth when this document differs from older plans.

## Runtime

- Next.js App Router with TypeScript and React.
- PostgreSQL accessed through Prisma.
- Docker Compose provides the local PostgreSQL database.
- There is no separate backend service. Pages, server actions, and route handlers live in `src/app/`.

## Production target and operations

The production target is a school-owned Hostinger VPS in Brazil. `docker-compose.production.yml` runs Caddy, the Next.js application, PostgreSQL, and a profile-only migration container. Caddy is the only service with host ports (80/443); the app and PostgreSQL communicate only over private Compose networks, so PostgreSQL is not publicly exposed.

`Dockerfile` produces a multi-stage standalone non-root application image and a separate Prisma migration image. The runtime application role has data read/write grants but does not own schema migrations; the PostgreSQL owner is used by initialization, migration, backup, and restore operations only. Caddy certificate state and PostgreSQL data are persistent volumes, while container log files are bounded.

`/api/health/live` has no database dependency and exposes only a detail-free liveness result. `/api/health/ready` runs a database query and returns only a ready/not-ready status. Compose/deploy automation waits for readiness; an external school-owned uptime monitor should poll liveness.

The GitHub Actions production workflow validates source/build, publishes immutable SHA-tagged application and migration images, then invokes `ops/deploy.sh` through a protected production environment. The server script serializes deploys, takes a pre-migration backup after the first database exists, runs `prisma migrate deploy`, restarts the app, and verifies readiness. Application rollback is explicit and never reverses database migrations.

The layered backup path is Hostinger VPS backups plus a nightly custom-format `pg_dump`, checksum, optional/required production `rclone` copy to a school-owned off-VPS remote, retention, freshness checks, alerting, and restore rehearsal into a temporary database. See `docs/operator-runbook.md` and `docs/production-readiness.md`. Password-reset SMTP is deliberately not implemented yet; credentials and all other production secrets remain only in protected VPS/GitHub configuration.

## Repository structure

- `src/app/` - App Router pages, layouts, role-specific workflows, and CSV/template route handlers.
- `src/app/actions/` - server actions for authentication, accounts, class records, classes, grades, imports, risk review, students, substitutions, bonus classes, and teacher work.
- `src/lib/` - shared session, password, Prisma, formatting, scheduling, translation, import, grade, bonus-class, and work-summary logic.
- `prisma/schema.prisma` - current database models and enums.
- `prisma/migrations/` - database migration history.
- `prisma/seed.sql` - repeatable local development data.
- `tests/critical-workflows.test.mjs` - static source-level checks for critical workflows.
- `docs/` - product, architecture, workflow, and operational notes.

The generated Prisma client is written to `src/generated/prisma` by `prisma generate` and should not be edited by hand.

## Roles and authentication

The current roles are `ADMIN`, `TEACHER`, and `RECEPTION`.

- Login uses email/password credentials.
- Passwords are hashed with the shared password helper.
- Sessions use a signed, HTTP-only seven-day cookie and require `AUTH_SECRET`.
- Inactive users cannot log in.
- Admin actions require an admin session.
- Teachers are restricted to their own active classes, with a controlled substitute-lesson path.
- Reception has separate scheduling and lookup workflows and does not receive general admin access.

## Route map

Public routes:

- `/`, `/login`, `/forgot-password`, `/reset-password`

Teacher and admin dashboard routes:

- `/dashboard`
- `/dashboard/account`
- `/dashboard/classes/[classId]`
- `/dashboard/classes/[classId]/record`
- `/dashboard/calendar`
- `/dashboard/personal-slots` (legacy redirect)
- `/dashboard/work`, `/dashboard/work/new`
- `/dashboard/bonus-classes`
- `/dashboard/substitutions/new`

Admin routes:

- `/admin/calendar`
- `/admin/manage-accounts`
- `/admin/classes` and `/admin/classes/[classId]`
- `/admin/students` and student profile/view routes
- `/admin/records` and record export/detail routes
- `/admin/risk`
- `/admin/substitutions`
- `/admin/work-summary`
- `/admin/data`
- `/admin/students/import` and `/admin/classes/import`, including templates and error reports

Reception routes:

- `/reception`
- `/reception/bonus-classes` and `/reception/bonus-classes/[bonusClassId]`
- `/reception/calendar`
- `/reception/students`
- `/reception/classes`

Legacy `/admin/teachers` routes redirect to account management. `/reception/students-and-classes` redirects to the reception student lookup.

## Data model

The schema currently contains `User`, `PasswordResetToken`, `Class`, `Student`, `Enrollment`, `Lesson`, `AttendanceRecord`, `HomeworkRecord`, `PartialEvaluationGrade`, `TestGrade`, `StudentRiskResolution`, `TeacherWorkLog`, `TeacherWorkLogStudent`, `BonusClass`, `PersonalSlotBooking`, `ImportBatch`, and `ImportRow`.

Important invariants:

- Teachers see active classes assigned to them; admins retain historical visibility of inactive data.
- A lesson is identified by class, lesson date, and lesson name. The class-record form requires a lesson name, so a class can have multiple named lessons on one date.
- Attendance and homework are unique per lesson and student.
- Partial and test grades are unique per class, student, and period.
- Substitute lessons retain the submitting teacher, the teacher who taught, and admin approval state.
- Monthly work summaries combine submitted lessons, completed bonus classes, and teacher work logs.
- Dated personal-slot bookings can use any active student and teacher. Together with recurring personal classes they share a three-concurrent-booth capacity. Overlapping completed personal work counts once by the union of its time intervals.
- Personal-slot bookings record attendance status and confirmation actor/time. Teachers may confirm only their own bookings; admins and reception retain booking management access.
- Imports are previewed, validated, and recorded through import batches and rows.

## Main workflows

- Teachers and admins create class records with attendance, homework, notes, drafts, and submissions.
- Teachers enter partial and test grades for their assigned classes.
- Teachers can view a weekly calendar of their active recurring classes, assigned bonus classes, and admin-created meetings that include them.
- The teacher dashboard supports exact-date and weekday views. Exact-date views combine recurring classes for that weekday with non-canceled personal-slot bookings, which appear as class-style cards with inline attendance confirmation. The legacy `/dashboard/personal-slots` path redirects to the dashboard.
- Overlapping calendar events in the same teacher/date column are grouped into expandable cards in all calendars. Personal groups show booth occupancy; expanded rows retain each event's student, class, purpose, teacher, duration, and status details.
- Admins review records, exports, grades, risk signals, substitutions, imports, and work summaries.
- Admins can view all-teacher Monday-to-Sunday class, bonus-class, and meeting schedules and open existing edit forms.
- Reception schedules bonus classes, uses student/class lookup, and confirms bonus attendance.
- Bonus scheduling blocks overlapping non-canceled bonus classes. An overlap with an active recurring `REGULAR`, `VIP`, or `PERSONAL` class returns the validated proposal to the create/edit form with a localized warning; only the explicit save-anyway submit proceeds, after the server reruns both conflict checks.
- Reception can view regular classes, bonus classes, and admin-created meetings together across a Monday-to-Sunday calendar.
- Users can select English or Brazilian Portuguese, a date format, and a light/dark theme.
- Teachers confirm assigned personal booth attendance from `/dashboard/personal-slots` using Present, Absent, or Excused; completed personal time remains included in merged payroll intervals.

## Development and verification

```powershell
npm.cmd install
Copy-Item .env.example .env.local
docker compose up -d
npm.cmd exec prisma migrate deploy
npm.cmd run db:seed
npm.cmd run dev
```

Useful checks:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run prisma:validate
npm.cmd run build
```

`npm.cmd test` currently runs static critical-workflow assertions rather than browser or database integration tests. See `README.md`, `docs/data-model.md`, and `docs/production-readiness.md` for operational details.
