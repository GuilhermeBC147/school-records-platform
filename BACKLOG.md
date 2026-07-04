# Product Backlog

## Now

- Finish teacher self-service and admin risk review on the current sprint branch.
- Keep risk-review thresholds easy to adjust.
- Confirm admin risk report links back to relevant class/student records.

## Next

- Add monthly teacher work summaries for payroll support.
- Count regular submitted lessons by the teacher who actually taught them.
- Add teacher-created paid activity records for events, game nights, Halloween, meetings, and other work.
- Add admin review/correction for monthly teacher work totals.

## Later

- Add reception accounts with limited access.
- Add independent bonus class scheduling.
- Prevent double-booking a teacher for bonus classes.
- Prevent bonus classes from overlapping regular class schedules when schedule data is available.
- Count completed bonus classes in monthly teacher work summaries.
- Add substitute teacher support for regular class lessons.
- Separate lesson submitter/audit history from the teacher counted for payroll.
- Add admin approval workflow for submitted records.
- Add record edit history.
- Add class/student archive workflow.
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
- Who is allowed to assign a substitute teacher: admins only, the primary teacher, or reception too?
- Should substitute teachers be able to see the full class page, or only the lesson record they are covering?
- Should extra activities require admin approval before they count for payroll?
- What paid activity categories should be fixed options instead of free text?
- What default duration should a bonus class have?
- Can a bonus class include more than one student?
- Should reception be able to edit or cancel bonus classes after the teacher confirms them?
- Should payroll summaries count by lessons, hours, or both?
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
