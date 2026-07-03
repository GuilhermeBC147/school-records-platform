# Production Readiness Checklist

Use this checklist before handing the class records platform to the school for day-to-day use.

## Environment

- Use a hosted PostgreSQL database owned by the school.
- Set `DATABASE_URL` to the hosted PostgreSQL connection string.
- Set `AUTH_SECRET` to a long random value that is different from local development.
- Keep `.env`, `.env.local`, and production secrets out of Git.
- Run `npm.cmd run build` before deployment.
- Run database migrations with `npm.cmd exec prisma migrate deploy`.

## Hosted PostgreSQL

The production database should support:

- automated daily backups
- point-in-time recovery if the provider offers it
- encrypted connections
- separate credentials for the app
- a documented owner account controlled by the school

After provisioning the hosted database:

```powershell
npm.cmd exec prisma migrate deploy
```

Seed data is for local development only. Do not run `npm.cmd run db:seed` against production unless the school explicitly wants demo data.

## Backup and Export Routine

Database backups protect the whole app. CSV exports help the school keep reporting copies of submitted class records.

Recommended routine:

- Keep hosted PostgreSQL automated backups enabled.
- Export class records from `/admin/records` at the end of each week.
- Store CSV exports in the school's normal document storage.
- Before any production migration, confirm there is a recent database backup.
- After any production migration, open `/admin/records` and export a small filtered CSV as a smoke test.

## Monitoring

For the first production version, keep monitoring simple and explicit:

- record the hosting provider dashboard URL
- record the database provider dashboard URL
- check failed deployment logs after every release
- check application logs if login, dashboard, or record submission fails
- verify disk/storage usage for CSV exports if exports are stored on the server

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

## Recovery Notes

If production data is damaged or missing:

- stop new record entry while investigating
- identify the most recent reliable database backup
- restore into a temporary database first when possible
- verify teacher dashboards and admin exports before switching traffic back
- keep the CSV exports as reporting backups, not as a full database replacement
