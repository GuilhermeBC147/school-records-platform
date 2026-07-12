# Production Readiness Checklist

Use this checklist before handing the class records platform to the school for day-to-day use. The repository-owned operations foundation is implemented in `Dockerfile`, `docker-compose.production.yml`, `.github/workflows/deploy.yml`, and `ops/`. The school must still provision and own the external accounts described below. See [guia-producao-pt-BR.md](guia-producao-pt-BR.md) for the school-facing Brazilian Portuguese procedure and [operator-runbook.md](operator-runbook.md) for the technical reference.

## Production architecture

- Caddy is the only public container and owns ports 80/443. It obtains and renews HTTPS certificates after public DNS points the school domain to the VPS.
- The Next.js application and PostgreSQL run in private Docker networks. Neither service publishes a host port; PostgreSQL is not publicly exposed.
- The Next.js runtime image is a standalone, non-root image. A separate migration image runs `prisma migrate deploy`; the normal application role cannot run migrations.
- PostgreSQL data, and Caddy certificate/configuration state, use named persistent volumes. Container logs are bounded to five 10 MB files per container.
- `/api/health/live` is a detail-free liveness response. `/api/health/ready` additionally checks PostgreSQL and returns only `ready` or `not_ready`.

## Environment

- Use a Hostinger VPS in Brazil, owned and controlled by the school, with PostgreSQL hosted alongside the application.
- Copy `.env.production.example` to `/etc/school-records-platform/production.env`, set owner `root:school-records-deploy`, and set mode `0640`. Never commit it.
- Generate independent random secrets for `POSTGRES_PASSWORD`, `APP_DATABASE_PASSWORD`, and `AUTH_SECRET`. URL-encode database passwords in connection strings.
- The production environment file defines `APP_DOMAIN`, `APP_URL`, `CADDY_ACME_EMAIL`, `APP_IMAGE`, `MIGRATION_IMAGE`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DATABASE_USER`, `APP_DATABASE_PASSWORD`, `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `AUTH_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `TZ`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`, `BACKUP_MAX_AGE_HOURS`, `REQUIRE_OFFSITE_BACKUP`, `RCLONE_REMOTE`, `ALERT_WEBHOOK_URL`, `DISK_WARNING_PERCENT`, `DISK_CRITICAL_PERCENT`, `MEMORY_WARNING_PERCENT`, and optional `CPU_WARNING_PERCENT`.
- Run `npm test`, `npm run typecheck`, `npm run prisma:validate`, and `npm run build` before images are published. The deployment workflow does this automatically.
- Only the migration image runs `prisma migrate deploy`. Never use development migration commands or `db:seed` in production.

## Hostinger VPS automation

The VPS is self-managed. The repository provides the following automation:

- GitHub Actions validates, builds, and publishes immutable application and migration images, then runs the server-side `ops/deploy.sh` only through the protected `production` environment.
- `ops/deploy.sh` refuses a dirty server checkout, serializes deployments, pulls the exact Git SHA images, checks the Compose configuration, creates/verifies the application database role, performs a pre-migration backup when a database volume already exists, runs `prisma migrate deploy`, starts the app, and waits for database-backed readiness.
- `ops/rollback-app.sh` can restore the prior application image only after an operator confirms schema compatibility. It intentionally never reverses migrations.
- Docker restart policies start services after crashes and Docker/host restarts. `ops/restart.sh` provides an explicit recovery check.
- Caddy manages HTTPS issuance and renewal once DNS and firewall prerequisites are complete. Caddy stores certificate state in a persistent Docker volume.
- `ops/systemd/` contains timers for nightly backups, backup-freshness checks, five-minute resource/container checks, and monthly temporary-database restore rehearsals.

Keep the runbook, recovery contacts, and credentials under school ownership. GitHub environment protection, the VPS SSH key, the off-VPS storage remote, the alert webhook, and external uptime monitor cannot be provisioned by this repository.

## PostgreSQL on the VPS

The initialization owner runs migrations, backups, and restores. The application uses a separate role granted only table/sequence read-write access. The application container connects over an internal network; do not add a PostgreSQL `ports:` mapping or a public firewall rule. The owner password is not passed to the running application.

Seed data is for local development only. Do not run `npm.cmd run db:seed` against production.

After the first healthy deployment, run `ops/bootstrap-first-admin.sh` manually from an interactive terminal to create the one initial `ADMIN` account. It refuses all non-empty user tables, never echoes the password, and is not a recurring operation.

## Backup and Export Routine

Database backups protect the whole app, including grades and risk-review data. CSV exports help the school keep reporting copies of submitted class records.

The layered routine is:

1. Enable school-owned automated backups or snapshots in Hostinger for the VPS.
2. Run `ops/backup-postgres.sh` nightly through the installed systemd timer. It produces a compressed custom-format `pg_dump` archive, validates that `pg_restore --list` can read it, writes a SHA-256 checksum, and uses temporary files so an incomplete dump is never marked successful.
3. Copy the archive and checksum to the school-owned `rclone` remote. Production requires this remote; the script fails and alerts if it is absent or verification fails.
4. Retain 30 days of local logical archives by default. The school must approve retention and storage cost.
5. Run `ops/check-backup.sh` daily and `ops/restore-rehearsal.sh` monthly. The rehearsal restores only to a newly created temporary database, checks all critical record families, then drops it unless explicitly retained for investigation.

The repository validates local dump/checksum/temporary-restore mechanics. It does not claim that Hostinger snapshots, a school remote, webhook alerts, or a production restore have been tested. CSV exports remain reporting copies, not backups.

## Monitoring

`ops/monitor.sh` checks container state, Docker CPU/memory statistics, host disk usage, and host memory every five minutes. Backup and deploy scripts send the same generic JSON webhook alert on failure. Configure a school-owned external uptime monitor to poll `https://<domain>/api/health/live`; it detects public reachability separately from VPS-local checks. Record the Hostinger dashboard, external monitor, webhook destination, and incident contacts in the runbook.

## Launch blockers still outside this PR

- DNS, TLS issuance, Hostinger backups, firewall/SSH setup, GitHub production approval, external uptime monitor, off-VPS `rclone` storage, alert destination, and a real restore rehearsal require school-owned accounts and explicit operator action.
- Password-reset SMTP is implemented and locally covered with an injected fake transport. The repository cannot prove the school-owned Hostinger mailbox, sender authorization, SPF/DKIM/DMARC, or inbox delivery. A real English and Brazilian Portuguese delivery/reset test on the deployed HTTPS origin is still required before launch.

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

- Production password-reset email delivery still needs school-owned Hostinger mailbox configuration, SPF/DKIM/DMARC verification, and a recorded real delivery test; only fake transport is verified locally.
- The school must complete the documented VPS/DNS/GitHub/off-VPS-storage/alert provisioning steps and perform a real production restore rehearsal before launch.

## Resolved scheduling blocker

The bonus-versus-recurring-class warning is complete: bonus conflicts remain blocked, recurring `REGULAR`, `VIP`, and `PERSONAL` overlaps require an explicit save-anyway submission, and the server recomputes conflicts before every write.

## Recovery Notes

If production data is damaged or missing:

- stop new record entry while investigating
- identify the most recent reliable database backup
- restore into a temporary database first when possible
- verify teacher dashboards, grade tables, admin risk review, and admin exports before switching traffic back
- keep the CSV exports as reporting backups, not as a full database replacement
