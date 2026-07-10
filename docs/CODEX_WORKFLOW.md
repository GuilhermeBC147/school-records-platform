# Codex Workflow

The repository is the source of truth. Chat history is temporary.

## Start a task

Read:

- `AGENTS.md`
- `PROJECT_BRIEF.md`, if present
- `SPRINTS.md`, especially the current handoff
- `docs/ARCHITECTURE.md` for routing, database, authentication, tests, or project-structure work
- `docs/DECISIONS.md` for relevant prior decisions
- the affected feature or operational docs

Use codebase-memory first when discovering code definitions, routes, callers, or data flow. Use text search for literals, configuration, and non-code files.

## Before editing

State:

1. the relevant files
2. the smallest safe change
3. what is out of scope

For larger changes, use the repository's blindspot and implementation-planning guidance before implementation.

## While editing

- Follow the current code and schema rather than old plans.
- Keep the change focused and avoid unrelated refactors.
- Do not change schema, business logic, or production dependencies unless the task explicitly requires it.
- Preserve unrelated work already present in the worktree.

## Verify and hand off

Run relevant checks when practical. For this project, the common checks are:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run prisma:validate
```

Finish with:

- what changed
- what remains
- important decisions or uncertainties
- the suggested next task
- a suggested commit message

Update the current handoff in `SPRINTS.md` when a meaningful workflow or project-state change is made.

## Starting prompt

```text
Read AGENTS.md, PROJECT_BRIEF.md if it exists, SPRINTS.md if it exists, and the relevant docs in docs/.

Use codebase-memory first for code discovery when relevant.

Today's task:
[describe task]

Before editing, tell me:
1. Which files are relevant.
2. What you plan to change.
3. What is out of scope.
```
