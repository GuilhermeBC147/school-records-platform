# School Records Platform - Codex Instructions

## Project context

This is a school records platform for an English school. The goal is to replace physical class records with a digital system for teachers to record attendance, homework, grades, class notes, and related student/class information.

The user is a beginner developer. Explain important technical decisions clearly and educationally, but still follow good professional development practices.

## Before editing

Before making changes, Codex should:

1. Read this AGENTS.md file.
2. Read PROJECT_BRIEF.md if it exists.
3. Read SPRINTS.md or the current handoff section if it exists.
4. Read docs/ARCHITECTURE.md if the task touches routing, database, authentication, tests, or project structure.
5. Use codebase-memory when searching for relevant files or tracing code flow.

## Default workflow

For every task:

1. Restate the task briefly.
2. Identify the relevant files before editing.
3. Make a short plan.
4. Implement the smallest safe change.
5. Avoid unrelated refactors.
6. Run relevant checks when practical.
7. Summarize what changed.
8. Suggest a commit message.

## Rules

- Do not change the database schema unless the task explicitly asks for it.
- Do not add new production dependencies without explaining why.
- Do not rewrite completed features unless the task explicitly asks for a redesign or refactor.
- Do not change business logic during pure UI/style tasks.
- Keep changes focused and incremental.
- Prefer small, meaningful commits.
- Update documentation when architecture, workflows, or major feature behavior changes.
- If something is unclear, explain the uncertainty before making assumptions.

## Small changes

For small UI, text, styling, or one-file changes:

- Inspect only the relevant files.
- Do not do a broad architecture review.
- Do not change database schema.
- Do not change unrelated business logic.
- Make the smallest safe change.

## Bigger changes

For new features, database changes, redesigns, or refactors:

- Use blindspot-pass before coding if available.
- Use implementation-plan before coding if available.
- Explain risks before editing.
- Break the work into small steps.
- Suggest tests or checks after implementation.

## Documentation

The repository is the source of truth. Chat history is temporary.

When the current code differs from the documentation, prefer the current code and suggest updating the docs.

Important documentation files:

- PROJECT_BRIEF.md
- SPRINTS.md
- BACKLOG.md
- docs/ARCHITECTURE.md
- docs/DECISIONS.md
- docs/CODEX_WORKFLOW.md

## End of session

At the end of a meaningful session, summarize:

1. What changed.
2. What remains.
3. Any important decisions.
4. Suggested next task.
5. Suggested commit message.

If appropriate, update the current handoff section in SPRINTS.md.