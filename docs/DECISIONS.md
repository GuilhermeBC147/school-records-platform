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

## 2026-07-10 - Keep bonus and regular schedule overlap open

Decision:
Do not claim that bonus classes are checked against regular class schedules. The current implementation prevents overlapping non-canceled bonus classes for the same teacher; regular-class overlap remains an explicit open item.

Reason:
The current bonus-class conflict helper only queries bonus-class records. The product requirement needs a separate decision about how regular class schedules should interact with independent bonus sessions.

Consequences:
Keep this item visible in the backlog and production-readiness notes until the behavior is decided, implemented, and tested.
