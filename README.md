# Integracao Sponte

Web platform for ESL teachers to record attendance and homework completion, then sync those records with Sponte through its API.

## Local Setup

This project uses Next.js, TypeScript, and npm.

Prerequisites:

- Node.js LTS installed on your computer.
- Git installed on your computer.
- Docker Desktop installed on your computer.

First run:

```powershell
cd "C:\Users\guilh\OneDrive\Documentos\Sponte"
npm.cmd install
Copy-Item .env.example .env.local
docker compose up -d
npm.cmd run prisma:validate
npm.cmd run dev
```

Then open:

```text
http://localhost:3000
```

Useful commands:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run typecheck
npm.cmd run prisma:validate
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

Do not use the local development password in production. Production will use a hosted PostgreSQL database with its own `DATABASE_URL`.

Seed sample data:

```powershell
npm.cmd run db:seed
```

The seed data creates one admin, two teachers, two classes, five students, sample enrollments, and one submitted class record.

## Planning

The project is being built sprint by sprint as a learning-focused product. See:

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [SPRINTS.md](SPRINTS.md)
- [BACKLOG.md](BACKLOG.md)
- [docs/sponte-api-notes.md](docs/sponte-api-notes.md)
