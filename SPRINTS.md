# Sprint Plan

## Working Rhythm

Each sprint should produce a small, working increment. Each task should usually become one commit or part of a small commit group.

Branch naming:

- `sprint-0-planning`
- `sprint-1-foundation`
- `sprint-2-auth-dashboard`
- `sprint-3-class-records`
- `sprint-4-sponte-sync`

Commit style:

- `docs: add project brief`
- `chore: scaffold next app`
- `feat: add teacher login`
- `fix: prevent duplicate attendance submission`
- `test: cover class record submission`

## Sprint 0: Planning and Setup

Goal: create a clear roadmap and prepare the repository.

Tasks:

- Write project brief.
- Write sprint plan.
- Create initial backlog.
- Record Sponte API documentation links and open questions.
- Confirm local Git/GitHub workflow.
- Choose initial tech stack.

Suggested commits:

- `docs: add project planning notes`
- `docs: document Sponte API references`

Done when:

- The repository explains what the project is.
- The next sprint has concrete implementation tasks.
- API uncertainty is captured instead of hidden.

## Sprint 1: Application Foundation

Goal: create the first runnable web app.

Tasks:

- Scaffold a Next.js TypeScript project.
- Add linting and formatting.
- Add basic app layout.
- Add environment variable example file.
- Add initial README setup steps.
- Confirm the app runs locally.

Suggested commits:

- `chore: scaffold next app`
- `chore: add environment template`
- `docs: add local setup instructions`

Done when:

- The app starts locally.
- The README explains how to run it.
- The initial homepage identifies the project.

## Sprint 2: Data Model

Goal: model the school workflow locally.

Tasks:

- Add Prisma.
- Configure PostgreSQL connection.
- Create models for users, teachers, classes, students, lessons, attendance records, homework records, and sync jobs.
- Add seed data for one admin, two teachers, sample classes, and students.
- Add simple developer/admin data view.

Suggested commits:

- `feat: add initial database schema`
- `feat: seed sample school data`
- `feat: add basic admin data view`

Done when:

- The database can be created from the schema.
- Seed data can be loaded.
- We can inspect sample teachers, classes, and students in the app.

## Sprint 3: Teacher Login and Dashboard

Goal: teachers can log in and see only their assigned classes.

Tasks:

- Add credentials-based authentication.
- Add login and logout.
- Add session protection for private pages.
- Add teacher dashboard.
- Restrict class visibility by teacher.

Suggested commits:

- `feat: add credentials login`
- `feat: add teacher dashboard`
- `feat: restrict class access by teacher`

Done when:

- A teacher can log in.
- A teacher sees their own assigned classes.
- A teacher cannot access another teacher's class page.

## Sprint 4: Class Records

Goal: teachers can submit attendance and homework completion.

Tasks:

- Add class session page.
- Add attendance checklist.
- Add homework completion checklist.
- Save draft records.
- Submit records.
- Prevent accidental duplicate submissions.
- Add admin review page for submitted records.

Suggested commits:

- `feat: add class record form`
- `feat: save attendance and homework records`
- `feat: add submitted records review`

Done when:

- A teacher can submit a class record.
- Submitted records are stored locally.
- An admin can review submitted records.

## Sprint 5: Sponte Integration Spike

Goal: understand and safely design the Sponte sync.

Tasks:

- Review official Sponte API documentation.
- Confirm authentication requirements.
- Identify endpoints for students, classes, lessons, attendance, and homework if available.
- Create a Sponte API client module with placeholder configuration.
- Create mapping notes between local records and Sponte payloads.
- Add manual sync design before enabling real writes.

Suggested commits:

- `docs: map local records to Sponte API concepts`
- `feat: add Sponte API client shell`

Done when:

- We know which Sponte endpoints are required.
- Missing credentials or unclear endpoints are documented.
- No production Sponte writes happen accidentally.

## Sprint 6: Manual Sync and Logs

Goal: send local records to Sponte with visibility and recovery.

Tasks:

- Add secure API credential configuration.
- Add manual sync button for admin.
- Record sync attempts and responses.
- Add retry flow for failed syncs.
- Add error messages that help staff resolve issues.

Suggested commits:

- `feat: add manual Sponte sync`
- `feat: log Sponte sync attempts`
- `feat: retry failed sync jobs`

Done when:

- Admin can manually sync submitted records.
- Sync results are visible.
- Failed syncs can be retried without losing local records.
