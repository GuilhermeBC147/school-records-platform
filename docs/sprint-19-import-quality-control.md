# Sprint 19 PostgreSQL Import Quality Control

Test date: 2026-07-12
Environment: local PostgreSQL with all 26 migrations applied
Command: `npm.cmd run test:imports:integration`

## Scope

The opt-in integration test calls the production student and class import preview/confirmation functions. Each CSV contains:

- one valid row selected for confirmation
- one invalid row with multiple validation failures
- one row matching an existing database record

Unique fixture names and identifiers make each run independent. A `finally` cleanup removes the created student/class fixtures and their import audit batches and rows.

## Results

| Import | Valid file/row | Invalid row | Duplicate row | Partial-failure confirmation | Cleanup/repeatability |
| --- | --- | --- | --- | --- | --- |
| Students | Pass | Pass | Pass | Pass | Pass |
| Classes | Pass | Pass | Pass | Pass | Pass |

For each confirmed mixed batch, PostgreSQL stored:

- `createdCount = 1`
- `skippedCount = 2`
- `duplicatedCount = 1`
- `failedCount = 1`
- batch status `CONFIRMED`

The valid student/class existed exactly once after confirmation. The invalid row created no record, and the duplicate fixture still existed exactly once. The test passed twice consecutively, demonstrating that its cleanup prevents test-generated duplicates.

## Test architecture

`tests/import-workflows.integration.test.ts` is intentionally separate from `npm test`. The default suite remains usable without a database, while `npm.cmd run test:imports:integration` is the explicit PostgreSQL quality-control gate.

`tsx` is a development-only dependency used to execute the real TypeScript import module and its path aliases. It is not included in the production dependency set.

## Findings

- The import preview is correctly audit-friendly: previewing persists a draft batch and row-level statuses before confirmation.
- Confirmation creates only explicitly accepted valid rows.
- Invalid and duplicate rows remain represented in the confirmed audit summary without creating school records.
- No import product defect was found in the covered scenarios.
- The earlier non-repeatable `prisma/seed.sql` `P2002` remains separate follow-up work; the integration test itself is repeatable and self-cleaning.
