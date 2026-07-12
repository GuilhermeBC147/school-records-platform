# Student and Class Imports

Admins can import students and classes from CSV files. Each import runs in two steps:

1. Upload a CSV file to create an import preview.
2. Review row-level validation errors and duplicate warnings, then confirm the rows that should be created.

Rows with validation errors are never imported. Rows with duplicate warnings are skipped by default. Import summaries are saved with counts for created, skipped, duplicated, and failed rows.

Student and class import previews show failed rows by default so corrections are easy to find. Ready rows, duplicate rows, and the full upload can be shown from the preview filter links. Failed and ready draft rows can be edited before confirmation. Only valid rows checked with `Accept` are submitted when the admin clicks `Submit selected students` or `Submit selected classes`.

## Student Import Template

Required columns:

- `full_name`: student's full name.

Optional columns:

- `enrollment_identifier`: unique enrollment or school identifier.
- `is_active`: blank, `true`, `false`, `yes`, `no`, `1`, or `0`. Blank means active.

Duplicate detection checks normalized full names and enrollment identifiers against both the uploaded file and existing students.

Student import also accepts the `Students.csv` export shape:

- `Nome` maps to `full_name`.
- `Situação` maps to `is_active`; `Ativo` imports as active.

Other columns from the source file are ignored.

## Class Import Template

Required columns:

- `name`: class name.
- `teacher_email`: email for an active teacher account.
- `duration_minutes`: integer from 1 to 600.
- `week_days`: semicolon-separated weekday values, for example `MONDAY;WEDNESDAY`.

Optional columns:

- `class_type`: `REGULAR`, `VIP`, `PERSONAL`, or blank. Blank means regular.
- `start_time`: `HH:MM` or blank.
- `book`: class book/material.
- `semester`: `1`, `2`, or blank.
- `year`: 2000 through 2100, or blank.
- `is_active`: blank, `true`, `false`, `yes`, `no`, `1`, or `0`. Blank means active.

Class import also accepts the `Classes.csv` export shape:

- `Nome` maps to class `name`.
- `Estagio` maps to `book`.
- `Professor` can match an active teacher by exact name when `teacher_email` is not present.
- `Modalidade` maps to `class_type`; `Personal` imports as personal, `VIP` imports as VIP, and blank/`Turmas`/`On-line` imports as regular.
- `Horario` maps Portuguese schedules like `Ter-Qui(08:00/09:00) Ter-Qui(09:00/10:00)` into weekdays, start time, and duration.
- `SituacaoTurma` maps to `is_active`; `Aberta` and `Em formação` import as active, while `Encerrada` imports as inactive.
- A term in the name such as `2026/2` maps to year `2026` and semester `2` when explicit year/semester columns are not present.

Other columns from the source file are ignored.

Duplicate detection checks the normalized class name, book, semester, year, and teacher combination against both the uploaded file and existing classes.
