# Sprint 19 Quality-Control Baseline

Audit date: 2026-07-12

This document records the first Sprint 19 quality-control pass. It separates automated evidence from checks that still require a browser, a production-like PostgreSQL database, or school-owned infrastructure.

## Automated baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Critical workflow assertions | Pass | `npm.cmd test`: 21 tests passed |
| TypeScript | Pass | `npm.cmd run typecheck` |
| Prisma schema | Pass | `npm.cmd run prisma:validate` |
| Production compilation | Pass | `npm.cmd run build`; all expected role, calendar, import, record, risk, and reporting routes compiled |

The critical workflow suite reads source files and verifies important authorization, validation, localization, scheduling, import, export, grade, risk, and payroll implementation patterns. It is not a browser or database integration suite.

## Workflow matrix

| Area | Automated evidence | Baseline result | Remaining runtime check |
| --- | --- | --- | --- |
| Admin | Account, class, student, record, risk, substitution, import, and work-summary assertions | Pass at source/build level | Exercise create, edit, review, export, and undo flows with production-like data |
| Teacher | Assigned-class access, record submission, grades, substitutions, bonus attendance, personal bookings, and work summaries | Pass at source/build level | Submit and edit records in a browser using a teacher account |
| Reception | Scoped scheduling and lookup permissions, bonus classes, calendars, and personal bookings | Pass at source/build level | Confirm reception cannot enter general administration routes and complete scheduling flows |
| Localization | Locale persistence, translation resources, fallback behavior, localized critical sources, and the browser matrix in `docs/sprint-19-bilingual-screen-matrix.md` | Pass locally | Repeat a focused locale smoke test after production deployment |
| Imports | Preview validation, duplicate detection, audit summaries, templates, and error reports | Pass at source/build level | Import valid, invalid, duplicate, and partial-failure CSV files against PostgreSQL |
| Grading | Grade schema, teacher access, value validation, display, and risk inputs | Pass at source/build level | Save and reload representative partial, mid-term, and final grades |
| Scheduling | Bonus conflicts, personal capacity, calendars, and personal payroll interval merging | Partial | Regular-class overlap warning with explicit save-anyway is not implemented; browser conflict scenarios remain |
| Risk review | Attendance, homework, grade signals, resolution, and undo patterns | Pass at source/build level | Seed threshold-boundary records and confirm resolved/unresolved filters in the browser |
| Reporting | Record CSV, teacher work summaries, substitutions, bonus classes, meetings, and extra activities | Pass at source/build level | Compare exports and monthly totals with known production-like fixtures |

## Findings

### Launch blocker

- Implement and test the intended warning plus explicit save-anyway path when a bonus class overlaps a recurring regular class. Bonus-versus-bonus conflicts must remain blocked.

### Required before launch

- Run import scenarios against a production-like PostgreSQL database.
- Add browser/database integration coverage or execute and retain a signed manual test record for critical writes and permissions.
- Verify SMTP password reset, deployment, monitoring, backup alerts, and a restore rehearsal on school-owned infrastructure.

### Branch dependency

This baseline was run from `codex/class-cards-and-personal-redesign` because `main` did not yet contain the completed Sprint 18 imports, calendars, and personal-slot work. Merge the dependency PR before merging or retargeting this QC branch.

## Exit decision

The automated baseline and local bilingual critical-screen pass are healthy, but the platform is not yet launch-ready. The next Sprint 19 task is the PostgreSQL-backed import scenario pass; scheduling overlap behavior and infrastructure checks remain tracked work.
