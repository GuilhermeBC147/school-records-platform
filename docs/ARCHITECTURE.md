# Architecture

## Purpose

This file explains the current structure of the School Records Platform so future Codex sessions can understand the project quickly.

## Overview

School Records Platform is a web application for managing school/class records, including students, classes, attendance, homework, grades, and teacher workflows.

## Main technologies

- Next.js
- TypeScript
- Prisma
- PostgreSQL
- npm

## Main folders

- `src/` - Application source code.
- `prisma/` - Prisma schema, migrations, and seed-related files.
- `tests/` - Automated tests, if present.
- `docs/` - Project documentation and workflow notes.

## Important rules

- Database schema changes should be intentional and reviewed carefully.
- Business logic should not be changed during pure UI tasks.
- Completed flows should not be rewritten without a specific refactor/redesign task.
- Documentation should describe the current state of the project, not old plans.

## To be updated by Codex

This file should later be updated after Codex audits the current repository.

Codex should add:

- Actual route/page structure.
- Main database models.
- Authentication/authorization flow, if implemented.
- Main feature flows.
- Test commands.
- Development commands.