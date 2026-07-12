# Sprint 19 Critical Workflow Browser and PostgreSQL Check

Test date: 2026-07-12

This document records repeatable local evidence for the previously source-only teacher, grading, account-management, and admin-review workflows. The test drives the real production-built Next.js interface in Chromium and checks the resulting writes in the local PostgreSQL database.

## Command

Install the managed browser once on a new test machine:

```powershell
npm.cmd exec -- playwright install chromium
```

Run the complete check:

```powershell
npm.cmd run test:critical:browser
```

The command builds the production application, prepares the ignored standalone static assets, starts the standalone server on `127.0.0.1:3100`, runs one serial Chromium scenario, and stops the server. It requires the normal local `DATABASE_URL` and `AUTH_SECRET`; it does not run the development seed.

## Verified workflow

| Area | Browser action | PostgreSQL or response evidence |
| --- | --- | --- |
| Teacher record | A unique teacher logs in and submits the fourth named class record with absent attendance and incomplete homework | Submitted lesson, teacher attribution, local school date, attendance, and homework rows match |
| Threshold boundary | Fixture setup supplies the first three submitted records; the browser supplies the fourth | Exactly four absences and four incomplete-homework rows exist, and the student appears in unresolved risk review |
| Grading | The teacher saves a partial grade plus complete Mid-term oral/composition/written values | Partial and test-grade rows persist with the selected values and survive the redirect/reload |
| Admin record review | A unique admin filters submitted records by class/student | The newly submitted lesson and student are visible |
| CSV export | The admin downloads the filtered record export | The downloaded CSV contains the unique lesson and student names |
| Risk review | The admin resolves the threshold risk, opens the resolved filter, and undoes the resolution | The resolution row is created once, leaves the unresolved view, appears in resolved, and is deleted on undo |
| Account management | The admin creates an active reception account, edits it inactive, and attempts login | Role/active state persist, and the inactive account receives the same invalid-login boundary |
| Browser health | Console and uncaught page errors are collected for the entire scenario | No browser error was recorded |

The scenario passed twice consecutively after the harness was stabilized. Every run uses unique identifiers and removes only its own accounts, class, student, lessons, attendance/homework, grades, risk resolution, and password-reset rows during teardown. Seeded and user-created local data remain untouched.

## Important boundaries

- This is local evidence against the existing local PostgreSQL service, not a production database test.
- The write scenario uses Brazilian Portuguese because the existing full critical-screen matrix already covers English and Brazilian Portuguese rendering and access boundaries.
- Playwright is a development-only dependency. Its Chromium binary lives in the user's Playwright cache and is not committed or included in the production image.
- The application under test continues using Prisma. Fixture setup and independent assertions use the existing PostgreSQL driver because Playwright's CommonJS worker cannot load the generated Prisma client that relies on `import.meta`.
- Substitution approval/undo payroll attribution and extra-activity approval/counting remain the next focused integration slice.
- School-owned SMTP, DNS, VPS, backup, alert, production smoke testing, and real restore evidence remain deferred until access exists.
