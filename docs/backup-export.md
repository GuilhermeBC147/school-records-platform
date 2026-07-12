# Backup and Export Notes

## Class Record CSV Export

Admins can export submitted class records from:

```text
http://localhost:3000/admin/records
```

Use the filters for teacher, class, student, or lesson date first. The `Export CSV` button downloads the currently filtered records.

The CSV includes one row per student record with:

- lesson name and date
- class and teacher
- student full name
- attendance status
- homework status
- submitter, submission time, and notes

This CSV is a reporting export for submitted attendance and homework records.
It is not a complete backup of grades, risk resolutions, substitutions, bonus
classes, teacher work logs, import batches, account settings, or enrollment
history.

## Grades and Risk Review Backups

Class-record CSV exports are reporting copies for attendance and homework. They are not a full database backup.

Grades and risk-review inputs depend on database tables that are not represented completely in the class-record CSV:

- partial evaluation grades
- mid-term and final test grades
- class rosters and enrollment history
- submitted attendance and homework history used by `/admin/risk`
- risk-resolution, substitution, bonus-class, work-log, and import records

Use the layered PostgreSQL backups as the source of truth for recovering grades and risk-review data. Before any production migration, confirm a recent database backup exists and that it includes the whole database, not only exported CSV files.

After restoring a backup, verify:

- `/dashboard/classes/[classId]` still shows saved grades
- `/admin/risk` still shows expected student risk signals
- `/admin/records` can still export submitted class records

## Hostinger VPS backup routine

Hostinger VPS backups protect the full server, but restoring one rolls the VPS back as a unit. Use them as one layer rather than the only database backup.

- Enable Hostinger's automatic VPS backups (weekly at minimum; daily if selected and available for the plan).
- Run a nightly logical PostgreSQL backup with `pg_dump` and store it outside the VPS.
- Alert on failed or missing dumps and keep a rolling retention window; 30 daily logical backups is a practical starting recommendation.
- Test restoring a dump into a temporary PostgreSQL database before launch and periodically afterward.
- Document the account owner, storage location, retention, restore steps, and who is responsible for responding to failures.

See [Hostinger's VPS backup and restore guide](https://support.hostinger.com/en/articles/1583232-how-to-back-up-or-restore-a-vps) for provider-level backup behavior.

## Local Backup Routine

For local development, keep the PostgreSQL Docker volume intact unless you intentionally want to reset sample data.

Before resetting local data, export submitted class records from the admin page and store the CSV somewhere outside the project folder.

For production, use Hostinger VPS backups and the separate logical PostgreSQL backup routine in addition to CSV exports for school reporting.
