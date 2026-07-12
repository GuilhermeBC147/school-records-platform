# School Records Platform

Web platform for ESL teachers to record attendance and homework completion without paper class records.

## Local Setup

This project uses Next.js, TypeScript, and npm.

Prerequisites:

- Node.js LTS installed on your computer.
- Git installed on your computer.
- Docker Desktop installed on your computer.

First run:

```powershell
cd "E:\Projects\school-records-platform"
npm.cmd install
Copy-Item .env.example .env.local
# Edit .env.local and set a local AUTH_SECRET value.
docker compose up -d
npm.cmd exec prisma migrate deploy
npm.cmd run db:seed
npm.cmd run prisma:validate
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

Development data preview:

```text
http://localhost:3000/admin/data
```

Teacher dashboard:

```text
http://localhost:3000/login
```

Development accounts use `password123`:

```text
admin@example.com
reception@example.com
ana@example.com
bruno@example.com
```

Useful commands:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run test
npm.cmd run typecheck
npm.cmd run prisma:validate
npm.cmd exec prisma migrate deploy
npm.cmd run db:seed
docker compose up -d
docker compose down
```

Note: use `npm.cmd` in PowerShell if your system blocks `npm.ps1` with an execution policy message.

## Local Database

The local database runs in Docker using PostgreSQL. The connection string in `.env.example` matches the database settings in `docker-compose.yml`.

Start the database:

```powershell
docker compose up -d
```

Stop the database:

```powershell
docker compose down
```

Delete the local database data and start fresh:

```powershell
docker compose down -v
```

Do not use the local development password in production. Production will use PostgreSQL on the school-owned Hostinger VPS with its own `DATABASE_URL`.

## Production target

The production foundation targets a school-owned Hostinger VPS in Brazil. Caddy is the public HTTPS proxy; the standalone Next.js app and PostgreSQL run through private Docker Compose networks, so PostgreSQL is not publicly exposed. The repository includes immutable-image deployment, migrations, readiness checks, restart/rollback guidance, resource/backup monitoring, checksummed logical backups, and temporary restore rehearsals. The school must still provide DNS, VPS, GitHub production approval, off-VPS storage, alert, and recovery credentials.

Read [docs/operator-runbook.md](docs/operator-runbook.md) before provisioning, then [docs/production-readiness.md](docs/production-readiness.md), [docs/backup-export.md](docs/backup-export.md), and [`.env.production.example`](.env.production.example). SMTP password-reset delivery remains a separate launch-blocker follow-up.

Seed sample data:

```powershell
npm.cmd run db:seed
```

The seed data creates one admin, one reception account, two teachers, two classes, five students, sample enrollments, one submitted class record with attendance and homework, and sample grading records.

## Planning

The project is being built sprint by sprint as a learning-focused product. See:

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [SPRINTS.md](SPRINTS.md)
- [BACKLOG.md](BACKLOG.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/CODEX_WORKFLOW.md](docs/CODEX_WORKFLOW.md)
- [docs/DECISIONS.md](docs/DECISIONS.md)
- [docs/data-model.md](docs/data-model.md)
- [docs/account-management.md](docs/account-management.md)
- [docs/backup-export.md](docs/backup-export.md)
- [docs/class-management.md](docs/class-management.md)
- [docs/imports.md](docs/imports.md)
- [docs/production-readiness.md](docs/production-readiness.md)
