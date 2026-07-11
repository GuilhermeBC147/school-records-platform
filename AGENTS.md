# School Records Platform - Codex Instructions

## Project context

This is a school records platform for an English school. The goal is to replace physical class records with a digital system for teachers to record attendance, homework, grades, class notes, and related student/class information.

The user is a beginner developer. Explain important technical decisions clearly and educationally, but still follow good professional development practices.

## Scheduling and personal booth rules

- Regular, VIP, and recurring `PERSONAL` classes remain represented by the `Class` model and must continue to use their existing roster, attendance, homework, grade, and lesson workflows.
- Temporary personal-booth uses such as reviews, make-up lessons, make-up tests, and other one-off activities are represented by `PersonalSlotBooking`. Do not create a permanent class or enrollment for an ad-hoc booth use.
- A personal time slot has capacity for three concurrent occupants per teacher. Capacity is shared between recurring `PERSONAL` classes and non-canceled dated `PersonalSlotBooking` records, including partial overlaps.
- Admins and reception may use the constrained personal-slot workflow. Do not broaden reception into general class administration.
- Teacher work summaries must count concurrent personal teaching time once. Merge submitted recurring personal lesson intervals and completed personal-slot booking intervals by teacher and date; do not simply add each personal record's duration.
- Personal-slot calendar events must remain visible in teacher, admin, and reception calendars and should identify the student, purpose, teacher, duration, and status.
- Overlapping calendar events in the same calendar column must render as one expandable card spanning their combined time range; expanded rows must keep each event readable. Adjacent events that only touch at an endpoint remain separate.
- Personal-slot groups should show occupancy such as `2/3` or `3/3`; mixed groups should show the number of overlapping events. This is a visual grouping rule and must not change scheduling conflict or payroll logic.
- Personal-slot UI, validation messages, statuses, navigation labels, and calendar text must be localized in English and Brazilian Portuguese. User-entered purposes remain unchanged.
- Any future schema change involving scheduling must explain its migration and preserve both recurring personal classes and ad-hoc personal-slot bookings.

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
