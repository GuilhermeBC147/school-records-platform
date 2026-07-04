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

## Grades and Risk Review Backups

Class-record CSV exports are reporting copies for attendance and homework. They are not a full database backup.

Grades and risk-review inputs depend on database tables that are not represented completely in the class-record CSV:

- partial evaluation grades
- mid-term and final test grades
- class rosters and enrollment history
- submitted attendance and homework history used by `/admin/risk`

Use hosted PostgreSQL backups as the source of truth for recovering grades and risk-review data. Before any production migration, confirm a recent database backup exists and that it includes the whole database, not only exported CSV files.

After restoring a backup, verify:

- `/dashboard/classes/[classId]` still shows saved grades
- `/admin/risk` still shows expected student risk signals
- `/admin/records` can still export submitted class records

## Local Backup Routine

For local development, keep the PostgreSQL Docker volume intact unless you intentionally want to reset sample data.

Before resetting local data, export submitted class records from the admin page and store the CSV somewhere outside the project folder.

For production, use the hosted PostgreSQL provider's scheduled database backup feature in addition to CSV exports for school reporting.
