# Backup and Export Notes

## Class Record CSV Export

Admins can export submitted class records from:

```text
http://localhost:3000/admin/records
```

Use the filters for teacher, class, student, or lesson date first. The `Export CSV` button downloads the currently filtered records.

The CSV includes one row per student record with:

- lesson name and date
- class, level, and teacher
- student and preferred name
- attendance status
- homework status
- submitter, submission time, and notes

## Local Backup Routine

For local development, keep the PostgreSQL Docker volume intact unless you intentionally want to reset sample data.

Before resetting local data, export submitted class records from the admin page and store the CSV somewhere outside the project folder.

For production, use the hosted PostgreSQL provider's scheduled database backup feature in addition to CSV exports for school reporting.
