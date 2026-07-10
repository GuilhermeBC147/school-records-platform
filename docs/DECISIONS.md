# Decisions

This file records important project decisions so they do not need to be re-discussed in every Codex session.

## Decision format

Use this format:

## YYYY-MM-DD - Decision title

Decision:
Reason:
Consequences:

---

## 2026-07-10 - Use repository documentation as long-term memory

Decision:
Use repository files such as AGENTS.md, PROJECT_BRIEF.md, SPRINTS.md, docs/ARCHITECTURE.md, and docs/DECISIONS.md as the main long-term memory for Codex.

Reason:
Chat history is temporary and can become outdated. The repository should be the source of truth.

Consequences:
Codex should read the relevant docs at the start of each task instead of relying on old chats.

---

## 2026-07-10 - Bench Context Mode and Ultracode for now

Decision:
Do not install Context Mode or Ultracode at this stage.

Reason:
The current project workflow should stay simple. Project docs, AGENTS.md, codebase-memory-mcp, and the repository's finding-unknowns-skills package, exposed through the `blindspot-pass` skill, are enough for now.

Consequences:
AGENTS.md and docs should not instruct Codex to use Context Mode or Ultracode.

---

## 2026-07-10 - Record the current implementation baseline

Decision:
Treat the current code and Prisma schema as the source of truth for the implemented platform. The baseline is a Next.js App Router application using TypeScript, PostgreSQL, Prisma, credentials-based authentication, signed sessions, and role-specific admin, teacher, and reception workflows.

Current product decisions reflected in code include named lessons per class/date, partial and Mid-term/Final grades, admin risk review, approved substitute attribution, monthly teacher work summaries, independent bonus classes, CSV imports with previews, English/Brazilian Portuguese localization, and account date-format/theme preferences.

Reason:
The original roadmap and backlog describe earlier stages of the project and are not sufficient to describe the current implementation.

Consequences:
Future tasks should start from the current schema, routes, actions, tests, and architecture notes. Older sprint items should be treated as historical plan unless the current handoff says they remain open.

---

## 2026-07-10 - Warn about bonus and regular schedule overlap

Decision:
If a bonus class overlaps a teacher's regular class schedule, show a clear warning with the conflicting class/time and allow the user to cancel or explicitly save anyway. Keep overlapping non-canceled bonus classes blocked.

Reason:
The school wants the conflict to be visible without preventing legitimate exceptions. Bonus-vs-bonus conflicts remain a hard scheduling error.

Consequences:
Implement conflict detection and warning UX, add focused tests, and do not add a database uniqueness rule for the regular-class overlap.

---

## 2026-07-10 - Project existing schedules into role-specific calendars

Decision:
Use the existing `Class` recurring schedule and `BonusClass` dated session records to render calendar views. Teachers receive a weekly personal view; admins and reception use a daily teacher-column view. Calendar events link to existing protected pages for editing, lookup, or attendance confirmation.

Reason:
The current data model already contains the information needed for the first calendar increment. A projection keeps the change reversible and avoids introducing a second scheduling write path or schema migration.

Consequences:
The first calendar increment does not model holidays, date ranges, recurring exceptions, or drag-and-drop editing. Classes without start times are shown outside the time grid, and the staff grid preserves the existing 07:00–22:00 range.

## 2026-07-10 - Use Hostinger VPS for production

Decision:
Host the Next.js application and PostgreSQL on a Hostinger VPS in Brazil, preferably with Docker Compose.

Reason:
This keeps the application and PostgreSQL under one provider while providing a Brazil deployment location. Hostinger's standard web/cloud hosting does not provide PostgreSQL, while its VPS offering supports a self-managed PostgreSQL setup.

Consequences:
The VPS remains self-managed, so the handoff must include automation for deployment, restart/recovery, HTTPS renewal, migrations, security updates, monitoring, and backup-failure alerts. Use Hostinger VPS backups as one layer and nightly logical PostgreSQL dumps stored outside the VPS as another. Keep the account, billing, credentials, and runbook under school ownership.
