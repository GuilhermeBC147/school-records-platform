# Production Readiness Checklist

Use this checklist before handing the class records platform to the school for day-to-day use.

## Environment

- Use a Hostinger VPS in Brazil, owned and controlled by the school, with PostgreSQL hosted alongside the application.
- Run the application and PostgreSQL through a documented Docker Compose/deployment setup.
- Set `DATABASE_URL` to the production PostgreSQL connection string.
- Set `AUTH_SECRET` to a long random value that is different from local development.
- Keep `.env`, `.env.local`, and production secrets out of Git.
- Run `npm.cmd run build` before deployment.
- Run `npm.cmd test`, `npm.cmd run typecheck`, and `npm.cmd run prisma:validate` before deployment.
- Run database migrations with `npm.cmd exec prisma migrate deploy`.

## Hostinger VPS automation

The VPS is self-managed, so the handoff should provide automation for:

- Deploying from the protected production branch and restarting the application.
- Running Prisma migrations before the application restart.
- Restarting the application/container after a crash or host reboot.
- HTTPS setup and automatic certificate renewal.
- Scheduled security updates or a clearly documented maintenance window.
- Monitoring uptime, CPU, memory, disk, database health, deploy failures, and backup failures.

Keep an operator runbook and recovery credentials under school ownership. These are planned handoff requirements and are not implemented yet.

## PostgreSQL on the VPS

The production database should support:

- Keep automated backups enabled: use Hostinger VPS backups plus a separate logical PostgreSQL backup routine.
- encrypted connections
- separate credentials for the app
- a documented owner account controlled by the school

After provisioning the VPS and PostgreSQL:

```powershell
npm.cmd exec prisma migrate deploy
```

Seed data is for local development only. Do not run `npm.cmd run db:seed` against production unless the school explicitly wants demo data.

## Backup and Export Routine

Database backups protect the whole app, including grades and risk-review data. CSV exports help the school keep reporting copies of submitted class records.

Recommended routine:

- Enable Hostinger VPS automatic backups (weekly at minimum; daily if selected and available for the plan).
- Run a nightly logical PostgreSQL backup with `pg_dump` and store it outside the VPS.
- Alert when a dump is missing or fails. Start with a 30-day rolling logical-backup window, then confirm the school's retention policy and storage cost.
- Test restoring a backup into a temporary database before launch and periodically afterward.
- Export class records from `/admin/records` at the end of each week.
- Store CSV exports in the school's normal document storage.
- Treat the layered PostgreSQL backups as the recovery source for grades, class rosters, and `/admin/risk` signals.
- Before any production migration, confirm there is a recent database backup.
- After any production migration, open `/admin/records` and export a small filtered CSV as a smoke test.
- After grade or risk-review changes, open one class grade table and `/admin/risk` as part of the smoke test.

## Monitoring

For the first production version, keep monitoring simple and explicit:

- record the hosting provider dashboard URL
- record the Hostinger dashboard URL
- check failed deployment logs after every release
- check application logs if login, dashboard, or record submission fails
- verify disk/storage usage for CSV exports if exports are stored on the server
- alert on resource exhaustion, failed deployments, failed database backups, and missing backup reports

## Release Smoke Test

After each deployment:

1. Log in as an admin.
2. Open the admin records page.
3. Filter submitted records by teacher, class, student, and date.
4. Export CSV and confirm it downloads.
5. Log out.
6. Log in as a teacher.
7. Open an assigned class.
8. Save a draft class record.
9. Submit a class record.
10. Edit the submitted record and confirm the update is visible to the admin.
11. Open a class grade table and confirm saved grades still load.
12. Open `/admin/risk` and confirm the report loads for admins only.

Also smoke-test the current role-specific scope:

- Teacher: assigned-class access, draft/submitted record, grades, work summary, and substitute lesson flow.
- Reception: bonus-class scheduling, calendar, student lookup, class lookup, and attendance confirmation.
- Admin: account management, student/class imports, substitution approval, work summaries, grades, risk review, and CSV export.
- Account preferences: English/Brazilian Portuguese, date format, and light/dark theme persistence.

## Known launch blockers

- Production password-reset email delivery still needs Hostinger SMTP configuration and a delivery test.
- Hostinger VPS deployment automation, the operator runbook, and a successful restore test must be completed.
- The regular-class overlap warning still needs implementation and focused tests; it should warn and allow an explicit save rather than block the bonus class.

## Recovery Notes

If production data is damaged or missing:

- stop new record entry while investigating
- identify the most recent reliable database backup
- restore into a temporary database first when possible
- verify teacher dashboards, grade tables, admin risk review, and admin exports before switching traffic back
- keep the CSV exports as reporting backups, not as a full database replacement
