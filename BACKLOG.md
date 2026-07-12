# Product Backlog

## Now

- Have the school configure the protected Hostinger mailbox variables, verify SPF/DKIM/DMARC, and record real English and Brazilian Portuguese password-reset delivery as the remaining SMTP launch gate.
- Have the school provision and verify its Hostinger VPS, DNS/HTTPS, GitHub production environment, off-VPS backup storage, alert destination, and first real restore rehearsal using the repository runbook.

## Next

- Add focused browser/PostgreSQL coverage for substitution approval/undo payroll attribution and extra-activity approval/counting.
- Repeat the local critical-workflow browser check against production when school-owned deployment access is available.
- Verify a restore from the real off-VPS logical PostgreSQL backup and record the evidence.

## Later

- Record edit history and broader audit history.
- Class and student archive workflows.
- Additional reporting or export formats beyond the current class-record CSV.
- Additional roles or school-system integrations if the school requests them.

## Open Questions

- Which Hostinger mailbox/sender address and SMTP credentials should production use?
- What backup retention and off-VPS storage policy should production use?
- Should the school require additional exports for grades, imports, bonus classes, or payroll review?

## Production decisions

- Use a Hostinger VPS in Brazil for production, with the Next.js application and PostgreSQL hosted together, preferably through Docker Compose.
- Keep blocking conflicts between overlapping non-canceled bonus classes. A bonus class overlapping a teacher's regular class should show a warning and allow an explicit save.
- Use a dedicated Hostinger Email SMTP mailbox for low-volume password-reset messages, with credentials stored only in VPS environment configuration.
- Use Hostinger VPS backups plus nightly logical PostgreSQL dumps stored outside the VPS. Alert on failures and test restores before launch and periodically afterward.

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
