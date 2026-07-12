# Sprint 19 Quality-Control Baseline and Scheduling Follow-up

Audit date: 2026-07-12

This document records the first Sprint 19 quality-control pass and the completed recurring-class overlap launch-blocker follow-up. It separates automated/local evidence from checks that still require school-owned infrastructure.

## Automated baseline

| Check | Result | Evidence |
| --- | --- | --- |
| Critical workflow assertions | Pass | `npm.cmd test`: 28 workflow/operations assertions plus 8 focused SMTP tests passed |
| Critical workflow browser/PostgreSQL integration | Pass | `npm.cmd run test:critical:browser`; teacher record, grades, admin record/CSV review, risk resolve/undo, account activation, and inactive login passed twice |
| Bonus scheduling PostgreSQL integration | Pass | `npm.cmd run test:bonus-scheduling:integration`; conflict queries plus create/update warning, confirmation, hard-block, and self-exclusion writes passed |
| TypeScript | Pass | `npm.cmd run typecheck` |
| Prisma schema | Pass | `npm.cmd run prisma:validate` |
| Production compilation | Pass | `npm.cmd run build`; all expected role, calendar, import, record, risk, and reporting routes compiled |

The critical workflow suite reads source files and verifies important authorization, validation, localization, scheduling, import, export, grade, risk, and payroll implementation patterns. It is not a browser or database integration suite.

## Workflow matrix

| Area | Automated evidence | Baseline result | Remaining runtime check |
| --- | --- | --- | --- |
| Admin | Account, class, student, record, risk, substitution, import, and work-summary assertions; account create/deactivate, record/CSV review, and risk resolve/undo browser coverage | Pass locally | Repeat a focused admin smoke test after production deployment |
| Teacher | Assigned-class access, record submission, grades, substitutions, bonus attendance, personal bookings, and work summaries; submitted-record browser/PostgreSQL coverage | Pass locally | Repeat record submission with a production teacher account |
| Reception | Scoped scheduling and lookup permissions, bonus classes, calendars, personal bookings, and bilingual recurring-overlap create/edit smoke tests | Pass locally | Repeat a focused scheduling/permission smoke test after production deployment |
| Localization | Locale persistence, translation resources, fallback behavior, localized critical sources, and the browser matrix in `docs/sprint-19-bilingual-screen-matrix.md` | Pass locally | Repeat a focused locale smoke test after production deployment |
| Imports | Preview validation, duplicate detection, audit summaries, templates, error reports, and the PostgreSQL integration pass in `docs/sprint-19-import-quality-control.md` | Pass locally | Repeat a focused import smoke test after production deployment |
| Grading | Grade schema, teacher access, value validation, display, risk inputs, and browser/PostgreSQL partial plus Mid-term persistence | Pass locally | Repeat representative grade save/reload after production deployment |
| Scheduling | Hard bonus conflicts, recurring-class warnings, PostgreSQL create/update decisions, bilingual create/edit confirmation, personal capacity, calendars, and personal payroll interval merging | Pass locally | Repeat the focused conflict smoke test after production deployment |
| Risk review | Attendance, homework, grade signals, exact four-record threshold, resolved/unresolved filters, resolution, and undo browser/PostgreSQL coverage | Pass locally | Repeat a focused risk smoke test after production deployment |
| Reporting | Record CSV plus teacher work summary, substitution, bonus-class, meeting, and extra-activity assertions; filtered record CSV browser download | Partial local runtime evidence | Add payroll fixture totals for approved substitutions and extra activities, then repeat production export checks |

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

- Add browser/database integration coverage for substitution payroll attribution and extra-activity approval/counting, or retain a signed manual record for those remaining writes.
- Verify real Hostinger SMTP password reset, deployment, monitoring, backup alerts, and a restore rehearsal on school-owned infrastructure.

### Critical workflow browser and PostgreSQL evidence

The repeatable Chromium scenario now covers the highest-risk previously source-only chain: a teacher submits the fourth absent/incomplete record, saves partial and Mid-term grades, and an admin reviews/downloads that record, resolves and undoes the resulting threshold risk, creates/deactivates reception access, and confirms the inactive account cannot log in. PostgreSQL assertions accompany every write, fixture cleanup is uniquely scoped, and the scenario passed twice with no browser errors. See `docs/sprint-19-critical-workflows-qc.md`.

### Branch dependency

PRs #49 and #50 are merged, and the scheduling follow-up branch starts from the updated `origin/main` merge commit for PR #50.

## Production operations local evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Source and operational assertions | Pass | `npm.cmd test`: 28 workflow/operations assertions plus 8 executable password-reset SMTP tests |
| TypeScript and Prisma | Pass | `npm.cmd run typecheck` and `npm.cmd run prisma:validate` |
| Application build | Pass | `npm.cmd run build`, including `/api/health/live` and `/api/health/ready` |
| Compose and Caddy configuration | Pass | `docker compose --env-file .env.production.example -f docker-compose.production.yml config`; `caddy validate` |
| Production images | Pass | Application runner and migration targets built locally; runner is UID 1001 and migration target reports Prisma 7.8.0 |
| Disposable migration and health | Pass | Fresh private Compose PostgreSQL applied all 26 migrations; application liveness and database readiness returned HTTP 200 |
| Application database role | Pass | The application route reached PostgreSQL; a direct application-role `CREATE TABLE` was rejected with schema permission denied |
| Backup and restore | Pass locally | Seeded disposable data was dumped in custom format, read by `pg_restore --list`, SHA-256 checked, and restored into a fresh temporary database with matching source/restored record counts |
| First administrator bootstrap | Pass locally | A fresh migrated database accepted one interactive institutional admin without echoing the password; a second non-interactive attempt refused immediately because a user already existed |
| Shell and workflow static checks | Pass | ShellCheck checked all operations scripts; actionlint checked `.github/workflows/deploy.yml` |

The local backup test deliberately set `REQUIRE_OFFSITE_BACKUP=false` because no school-owned remote exists. It therefore does not prove `rclone`, Hostinger backup, alert-webhook, TLS/DNS, external uptime monitoring, or a real production restore. The temporary test containers, volume, and backup archives were removed after validation.

## Password-reset SMTP local evidence

| Check | Result | Evidence |
| --- | --- | --- |
| English active account | Pass locally | Injected transport received English subject/body and the explicit HTTPS `APP_URL` reset link |
| Brazilian Portuguese active account | Pass locally | Injected transport received localized subject/body for the saved `PT_BR` account locale |
| Unknown/inactive account | Pass locally | No token record and no delivery callback/message; the action retains the same generic redirect |
| Token protection | Pass locally | Only SHA-256 hash persisted; expiry remained exactly 30 minutes; production result omitted the raw token |
| Development seam | Pass locally | Non-production preparation can still expose the raw token for the existing local reset-link page |
| Delivery failure | Pass locally | Provider error containing simulated credential, recipient, and token data was discarded; only `PASSWORD_RESET_EMAIL_DELIVERY_FAILED` was logged |
| Hostinger TLS configuration | Pass locally | Port 465/secure and port 587/required-STARTTLS combinations validated; mismatched settings rejected |
| Production container configuration | Pass locally | Compose passes only the seven explicit protected reset/SMTP variables into the private app service |
| Standalone production image | Pass locally | Clean `runner` target installed Nodemailer, compiled the application, and produced the non-root standalone image |

These tests use an in-memory repository and fake mail transport. They do not connect to Hostinger, inspect the school's SPF/DKIM/DMARC records, or prove inbox delivery. The school must record real English and Brazilian Portuguese delivery and link use on the deployed HTTPS origin before launch.

## Exit decision

The automated baseline, local bilingual critical-screen pass, PostgreSQL import pass, PostgreSQL/browser scheduling and critical-write passes, repository-owned production operations checks, and fake-transport SMTP checks are healthy. Remaining repository-controlled integration work is substitution payroll attribution plus extra-activity approval/counting. The platform is not yet launch-ready: the school must later complete external production provisioning, real Hostinger mailbox/DNS delivery evidence, production smoke checks, and a real restore rehearsal.
