# Decisions

This file records important project decisions so they do not need to be re-discussed in every Codex session.

## Decision format

Use this format:

## YYYY-MM-DD - Decision title

Decision:
Reason:
Consequences:

---

## 2026-07-10 - Use repository documentation as long-term memory

Decision:
Use repository files such as AGENTS.md, PROJECT_BRIEF.md, SPRINTS.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md as the main long-term memory for Codex.

Reason:
Chat history is temporary and can become outdated. The repository should be the source of truth.

Consequences:
Codex should read the relevant docs at the start of each task instead of relying on old chats.

---

## 2026-07-10 - Bench Context Mode and Ultracode for now

Decision:
Do not install Context Mode or Ultracode at this stage.

Reason:
The current project workflow should stay simple. Project docs, AGENTS.md, codebase-memory-mcp, and the repository's finding-unknowns-skills package, exposed through the `blindspot-pass` skill, are enough for now.

Consequences:
AGENTS.md and docs should not instruct Codex to use Context Mode or Ultracode.

---

## 2026-07-10 - Record the current implementation baseline

Decision:
Treat the current code and Prisma schema as the source of truth for the implemented platform. The baseline is a Next.js App Router application using TypeScript, PostgreSQL, Prisma, credentials-based authentication, signed sessions, and role-specific admin, teacher, and reception workflows.

Current product decisions reflected in code include named lessons per class/date, partial and Mid-term/Final grades, admin risk review, approved substitute attribution, monthly teacher work summaries, independent bonus classes, CSV imports with previews, English/Brazilian Portuguese localization, and account date-format/theme preferences.

Reason:
The original roadmap and backlog describe earlier stages of the project and are not sufficient to describe the current implementation.

Consequences:
Future tasks should start from the current schema, routes, actions, tests, and architecture notes. Older sprint items should be treated as historical plan unless the current handoff says they remain open.

---

## 2026-07-10 - Warn about bonus and regular schedule overlap

Decision:
If a bonus class overlaps a teacher's recurring class schedule, return the validated proposal to the create/edit form with a clear localized warning and allow the user to leave, edit the proposal, or explicitly save anyway. Keep overlapping non-canceled bonus classes blocked.

Reason:
The school wants the conflict to be visible without preventing legitimate exceptions. Bonus-vs-bonus conflicts remain a hard scheduling error.

Consequences:
The server checks bonus conflicts first, then active recurring `REGULAR`, `VIP`, and `PERSONAL` schedules on the same weekday. A save-anyway value records intent only: the server reruns both checks before writing. The first implementation keeps the proposed schedule visible rather than enumerating conflicting class details. Focused PostgreSQL and bilingual browser checks cover create and edit, and no database uniqueness rule is added for recurring-class overlaps.

---

## 2026-07-10 - Project existing schedules into role-specific calendars

Decision:
Use the existing `Class` recurring schedule and `BonusClass` dated session records to render calendar views. Teachers, admins, and reception use a Monday-to-Sunday week view. Admin and reception cards include the assigned teacher instead of using one column per teacher. Calendar events link to existing protected pages for editing, lookup, or attendance confirmation.

Reason:
The current data model already contains the information needed for the first calendar increment. A projection keeps the change reversible and avoids introducing a second scheduling write path or schema migration.

Consequences:
The first calendar increment does not model holidays, date ranges, recurring exceptions, or drag-and-drop editing. Classes without start times are shown outside the time grid, and the week view uses an 08:00–21:00 range.

## 2026-07-10 - Project admin meetings into role-scoped calendars

Decision:
Reuse the existing TeacherWorkLog records created by the admin meeting workflow as calendar events. The workflow already writes one MEETING work log per selected teacher, so each teacher calendar can query its own record while admin and reception views can project all matching teacher records into the shared week.

Reason:
This keeps the work-summary record and the calendar projection aligned. It shows a meeting to every included teacher without adding a second shared-event table or changing the database schema.

Consequences:
Only admin-created MEETING work logs are projected. Meetings without a start time appear in the calendar's unscheduled list, while timed meetings use the existing duration and overlap layout. The admin view collapses the per-teacher rows from one admin action into one card and combines the teacher names; reception retains its teacher-specific view. Teacher cards link to teacher work; admin cards link to the admin work summary, and reception cards remain view-only within its calendar flow.

## 2026-07-10 - Make calendar cards duration-aware and scannable

Decision:
Render scheduled events as positioned cards whose height matches their duration. Place partially overlapping events in separate lanes, and group admin/reception events with the same day and exact start time behind an expandable card. Use an opaque card surface and a raised stacking layer so event text remains readable above the timeline rules. Keep the board within its panel at normal widths and contain narrow-screen scrolling inside the calendar viewport.

Reason:
Teachers, admins, and reception need to understand class length and concurrent activity from the weekly view without text collisions or cards extending beyond the surrounding page frame.

Consequences:
Grouped cards use the longest duration of their grouped events, while events with different start times remain separate. The layout remains read-only for scheduling purposes; existing event links continue to open the relevant protected workflow.

---

## 2026-07-11 - Show teacher personal bookings on the date dashboard

Decision:
Use the teacher dashboard as the date-focused view for recurring classes and non-canceled personal-slot bookings. Show start time on recurring class cards, render personal bookings with the same card treatment, and keep teacher attendance confirmation inline. Retain the existing weekday filter as a separate broader recurring-class view. Sunday remains unavailable for recurring classes, while dated personal bookings can still be displayed for a selected Sunday.

Reason:
Teachers need the day’s complete schedule and personal-slot attendance workflow in one place without changing the existing `PersonalSlotBooking` model or server actions.

Consequences:
The teacher topbar no longer links to a separate personal-slots page. The legacy path redirects to the dashboard, and calendar links return to the relevant date. Admin and reception booking management remain unchanged at `/reception/personal-slots`.

## 2026-07-10 - Use Hostinger VPS for production

Decision:
Host the Next.js application and PostgreSQL on a Hostinger VPS in Brazil, preferably with Docker Compose.

Reason:
This keeps the application and PostgreSQL under one provider while providing a Brazil deployment location. Hostinger's standard web/cloud hosting does not provide PostgreSQL, while its VPS offering supports a self-managed PostgreSQL setup.

Consequences:
The VPS remains self-managed, so the handoff must include automation for deployment, restart/recovery, HTTPS renewal, migrations, security updates, monitoring, and backup-failure alerts. Use Hostinger VPS backups as one layer and nightly logical PostgreSQL dumps stored outside the VPS as another. Keep the account, billing, credentials, and runbook under school ownership.

## 2026-07-10 - Model ad-hoc personal booth use separately

Decision:
Keep recurring one-student personal classes as `Class` records, and use dated `PersonalSlotBooking` records for reviews, make-up lessons, tests, and other booth uses involving any active student and teacher.

Reason:
Creating a class enrollment for temporary booth use would incorrectly attach that student to grades, attendance, and the permanent roster. Both sources still consume the same three-booth capacity.

Consequences:
Admins and reception schedule ad-hoc bookings. Completed bookings and submitted recurring personal lessons are combined as time intervals in teacher work summaries, so concurrent personal work counts once rather than once per student.

---

## 2026-07-12 - Use Caddy and private Docker Compose networks for production

Decision:
Use Caddy as the public reverse proxy and HTTPS certificate manager. Run Caddy, a standalone non-root Next.js image, PostgreSQL, and a profile-only Prisma migration image through production Docker Compose networks. Only Caddy publishes host ports 80 and 443.

Reason:
Caddy keeps TLS issuance and renewal approachable for a school-operated VPS. Private Compose networking makes the correct PostgreSQL default explicit and separates public ingress from application/database traffic.

Consequences:
DNS and firewall prerequisites remain school-owned. Caddy state and PostgreSQL data are persistent volumes. The application image never needs the database owner password; migrations run in a separate image with the owner connection. `DATABASE_URL`, `MIGRATION_DATABASE_URL`, and all production secrets live in `/etc/school-records-platform/production.env`, not Git.

---

## 2026-07-12 - Use forward-only migration recovery and layered logical backups

Decision:
Deploy immutable Git-SHA images through a protected GitHub production environment and a repository server-side script. Require a pre-migration logical backup after initial bootstrap, do not automate destructive database rollback, and use Hostinger VPS backups plus checksummed `pg_dump` archives copied off-VPS with temporary-database restore rehearsals.

Reason:
An older application image can sometimes be restored safely, but a general automatic reversal of database migrations can destroy or misinterpret school records. Provider snapshots and CSV exports alone do not provide enough independent recovery coverage.

Consequences:
`ops/rollback-app.sh` restores only an explicitly compatible application image. Failed deployment/backup/missing-backup conditions use a generic school-owned alert webhook. The initial policy is 30 days of logical archive retention, pending school cost and ownership approval. The repository can validate mechanics locally but cannot claim a real provider/remote restore without school credentials.

---

## 2026-07-12 - Defer SMTP delivery to a focused launch-blocker change

Decision:
Do not add Hostinger SMTP transport to the production operations PR.

Reason:
Correct email delivery requires a maintained dependency, injected test transport, localized copy, token-safe failure behavior, and a real mailbox/DNS delivery check. Combining that with deployment and recovery operations would make review and launch evidence less clear.

Consequences:
The existing reset-token security properties remain unchanged, but production password reset is not launch-ready. The next Sprint 19 task must implement and prove Hostinger SMTP delivery before launch.

## 2026-07-10 - Confirm personal booth attendance through a teacher workflow

Decision:
Group personal bookings by teacher, date, and exact start time in expandable calendar cards. Let teachers confirm their own bookings as Present, Absent, or Excused from a dedicated personal-slots page.

Reason:
Three narrow side-by-side cards do not remain readable, and attendance confirmation needs ownership checks and enough space for a clear status selection.

Consequences:
Overlapping events in the same calendar column are grouped to prevent unreadable side-by-side cards. Personal-only groups display booth occupancy, while mixed groups display the overlapping-event count. Expanded rows retain the individual event details. Completed personal time counts toward payroll regardless of the selected attendance status, matching the existing bonus-class rule.

## 2026-07-10 - Group all overlapping calendar events

Decision:
When event time intervals overlap within a calendar column, render one expandable card spanning the combined time range and show each event as a nested row.

Reason:
Side-by-side cards become unreadable when several classes overlap, including partial overlaps with different start times or durations.

Consequences:
Adjacent events that only touch at an endpoint remain separate. Unscheduled events remain in the existing unscheduled list. The grouping is visual only and does not alter scheduling conflicts or payroll calculations.
