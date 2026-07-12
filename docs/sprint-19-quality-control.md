# Sprint 19 Quality-Control Baseline and Scheduling Follow-up

Audit date: 2026-07-12

This document records the first Sprint 19 quality-control pass and the completed recurring-class overlap launch-blocker follow-up. It separates automated/local evidence from checks that still require school-owned infrastructure.

## Automated baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Critical workflow assertions | Pass | `npm.cmd test`: 22 tests passed |
| Bonus scheduling PostgreSQL integration | Pass | `npm.cmd run test:bonus-scheduling:integration`; conflict queries plus create/update warning, confirmation, hard-block, and self-exclusion writes passed |
| TypeScript | Pass | `npm.cmd run typecheck` |
| Prisma schema | Pass | `npm.cmd run prisma:validate` |
| Production compilation | Pass | `npm.cmd run build`; all expected role, calendar, import, record, risk, and reporting routes compiled |

The critical workflow suite reads source files and verifies important authorization, validation, localization, scheduling, import, export, grade, risk, and payroll implementation patterns. It is not a browser or database integration suite.

## Workflow matrix

| Area | Automated evidence | Baseline result | Remaining runtime check |
| --- | --- | --- | --- |
| Admin | Account, class, student, record, risk, substitution, import, and work-summary assertions | Pass at source/build level | Exercise create, edit, review, export, and undo flows with production-like data |
| Teacher | Assigned-class access, record submission, grades, substitutions, bonus attendance, personal bookings, and work summaries | Pass at source/build level | Submit and edit records in a browser using a teacher account |
| Reception | Scoped scheduling and lookup permissions, bonus classes, calendars, personal bookings, and bilingual recurring-overlap create/edit smoke tests | Pass locally | Repeat a focused scheduling/permission smoke test after production deployment |
| Localization | Locale persistence, translation resources, fallback behavior, localized critical sources, and the browser matrix in `docs/sprint-19-bilingual-screen-matrix.md` | Pass locally | Repeat a focused locale smoke test after production deployment |
| Imports | Preview validation, duplicate detection, audit summaries, templates, error reports, and the PostgreSQL integration pass in `docs/sprint-19-import-quality-control.md` | Pass locally | Repeat a focused import smoke test after production deployment |
| Grading | Grade schema, teacher access, value validation, display, and risk inputs | Pass at source/build level | Save and reload representative partial, mid-term, and final grades |
| Scheduling | Hard bonus conflicts, recurring-class warnings, PostgreSQL create/update decisions, bilingual create/edit confirmation, personal capacity, calendars, and personal payroll interval merging | Pass locally | Repeat the focused conflict smoke test after production deployment |
| Risk review | Attendance, homework, grade signals, resolution, and undo patterns | Pass at source/build level | Seed threshold-boundary records and confirm resolved/unresolved filters in the browser |
| Reporting | Record CSV, teacher work summaries, substitutions, bonus classes, meetings, and extra activities | Pass at source/build level | Compare exports and monthly totals with known production-like fixtures |

## Findings

### Resolved launch blocker

- Bonus-versus-bonus overlaps remain hard blocked, including when a forged or stale save-anyway value is submitted.
- Active recurring `REGULAR`, `VIP`, and `PERSONAL` classes on the same weekday warn for strict interval overlaps. Endpoint-only adjacency, different weekdays, inactive classes, and missing/malformed schedule data do not warn.
- Create and edit return the validated proposal to a localized warning form. Only the explicit save-anyway button submits confirmation intent, and the server reruns bonus and recurring conflict checks before writing.
- Edit excludes the current bonus class from only the bonus-versus-bonus query.

### Scheduling browser evidence

The local reception workflow passed in English and Brazilian Portuguese for both create and edit:

- the first overlapping submission performed no write and showed the localized warning;
- student, subject, teacher, date, time, duration, and notes were restored;
- the explicit localized save-anyway action created or updated the record;
- success messages and stored times matched the confirmed proposal;
- browser console error logs were empty;
- the reception test account was restored to English and uniquely prefixed fixtures were removed.

The repeatable fixture commands are:

```powershell
npm.cmd run test:bonus-scheduling:browser-fixture
npm.cmd run test:bonus-scheduling:browser-fixture -- cleanup
```

### Required before launch

- Add browser/database integration coverage or execute and retain a signed manual test record for the remaining critical writes and permissions outside the now-covered scheduling workflow.
- Verify SMTP password reset, deployment, monitoring, backup alerts, and a restore rehearsal on school-owned infrastructure.

### Branch dependency

PRs #49 and #50 are merged, and the scheduling follow-up branch starts from the updated `origin/main` merge commit for PR #50.

## Exit decision

The automated baseline, local bilingual critical-screen pass, PostgreSQL import pass, and PostgreSQL/browser scheduling conflict pass are healthy. The scheduling launch blocker is resolved, but the platform is not yet launch-ready. The next task is the production environment and Hostinger VPS automation/operator checklist, including SMTP, monitoring, layered backups, alerts, and restore rehearsal.
