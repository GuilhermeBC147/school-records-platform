# Product Backlog

## Now

- Add password reset token model.
- Add forgot password and reset password pages.
- Add admin teacher account management.
- Prevent inactive users from logging in.
- Document production email requirements for password reset.

## Next

- Add class fields for book, semester, year, and active status.
- Add admin class creation and editing.
- Assign classes to teachers from the admin UI.
- Show only active classes to teachers.
- Add admin student creation and editing.
- Add class roster management.

## Later

- Add admin approval workflow for submitted records.
- Add record edit history.
- Add class/student archive workflow.
- Add substitute teacher support.
- Add bilingual UI labels if needed.
- Add broader workflow tests around admin setup.

## Open Questions

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
