# Product Backlog

## Now

- Complete production-readiness checks across admin, teacher, and reception workflows.
- Confirm the production password-reset email path.
- Confirm PostgreSQL backup ownership, retention, and restore testing.
- Decide whether bonus classes must conflict with regular class schedules.

## Next

- Add browser and production-database checks for critical workflows.
- Run a full quality-control pass for imports, localization, grading, risk review, scheduling, substitutions, exports, and work summaries.
- Document any remaining launch blockers and follow-up work.

## Later

- Record edit history and broader audit history.
- Class and student archive workflows.
- Additional reporting or export formats beyond the current class-record CSV.
- Additional roles or school-system integrations if the school requests them.

## Open Questions

- Which school-owned email provider should deliver password-reset links?
- Should bonus classes be blocked when they overlap a teacher's regular class schedule?
- What backup retention and restore-test schedule does the school require?
- Should the school require additional exports for grades, imports, bonus classes, or payroll review?

## Decisions already reflected in code

- Risk thresholds are 4 incomplete homework records, 4 missed classes, 2 consecutive missed classes, test total below 7, and oral grade C or below.
- Only `ABSENT` attendance counts as a missed class by default; `LATE` and `EXCUSED` remain visible but do not trigger that signal.
- Substitute lessons use teacher submission, taught-by attribution, and admin approval state.
- Work summaries count lessons and hours, including approved substitutions, completed bonus classes, and work logs.
- The interface supports English and Brazilian Portuguese; the default locale is Brazilian Portuguese.

## Learning Goals

- Learn Git branches, commits, and pull requests.
- Learn how to break a product into sprints.
- Learn how to build a full-stack web app.
- Learn authentication and access control.
- Learn database modeling.
- Learn how to design reliable admin workflows.
- Learn how to export and back up school records.
