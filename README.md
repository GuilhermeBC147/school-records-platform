# Integracao Sponte

Web platform for ESL teachers to record attendance and homework completion, then sync those records with Sponte through its API.

## Local Setup

This project uses Next.js, TypeScript, and npm.

Prerequisites:

- Node.js LTS installed on your computer.
- Git installed on your computer.

First run:

```powershell
cd "C:\Users\guilh\OneDrive\Documentos\Sponte"
npm.cmd install
Copy-Item .env.example .env.local
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
```

Note: use `npm.cmd` in PowerShell if your system blocks `npm.ps1` with an execution policy message.

## Planning

The project is being built sprint by sprint as a learning-focused product. See:

- [PROJECT_BRIEF.md](PROJECT_BRIEF.md)
- [SPRINTS.md](SPRINTS.md)
- [BACKLOG.md](BACKLOG.md)
- [docs/sponte-api-notes.md](docs/sponte-api-notes.md)
