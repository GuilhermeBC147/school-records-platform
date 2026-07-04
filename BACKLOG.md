# Product Backlog

## Now

- Remove preferred name from students across schema, forms, lists, rosters, records, exports, seed data, and tests.
- Remove lesson time from teacher class records.
- Normalize lesson uniqueness to one record per class per lesson date.
- Update data-model documentation for date-only lessons.

## Next

- Add grading schema for partial evaluations and Mid-term/Final tests.
- Add letter-grade scale from `D-` through `A`, with no `A+`.
- Add teacher grade-entry UI inside class management.
- Validate composition scores out of 2 and written test scores out of 8.
- Display composition plus written test as a total out of 10.

## Later

- Add teacher change-password page while logged in.
- Add admin review report for repeated incomplete homework.
- Add admin review report for many missed classes.
- Add admin review report for two missed classes in a row.
- Add filters for admin risk review by class, teacher, and date range.
- Add admin approval workflow for submitted records.
- Add record edit history.
- Add class/student archive workflow.
- Add substitute teacher support.
- Add bilingual UI labels if needed.
- Add broader workflow tests around admin setup.

## Open Questions

- What threshold counts as "a lot" of incomplete homework assignments?
- What threshold counts as "a lot" of missed classes?
- Should absences marked `EXCUSED` count as missed classes in the admin risk report?
- Should late arrivals count in the risk report, or only absences?
- Should grade entry be editable after the teacher saves it, or locked after an admin review?
- Should admins be able to edit grades, or only view/export them?
- Should grade reports be exportable to CSV in the first grading sprint?
- Should an admin approve records before they become final?
- What should happen when a class has a substitute teacher?
- Does the school need Portuguese, English, or bilingual UI labels?
- Should password reset emails be sent through the hosting provider, SMTP, or a transactional email service?
- Should class books be free text or selected from an admin-managed book list?
- Should semesters be fixed to 1 and 2, or support custom terms?

## Learning Goals

- Learn Git branches, commits, and pull requests.
- Learn how to break a product into sprints.
- Learn how to build a full-stack web app.
- Learn authentication and access control.
- Learn database modeling.
- Learn how to design reliable admin workflows.
- Learn how to export and back up school records.
