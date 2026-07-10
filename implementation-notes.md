# Implementation notes

## Deviations

No deviations from the approved plan yet.

- 2026-07-10 calendar build started: preserving the existing notes from the prior landing-page build and adding calendar decisions below.

## Discovered edge cases

- The public page has no signed-in account preference, so it intentionally uses the existing unauthenticated light theme and default locale.
- Admin shortcuts are denser than teacher or reception shortcuts; the mobile row uses horizontal scrolling with full-size touch targets.
- The existing root layout still resolves the current user to apply account theme preferences, but the new landing page itself has no authentication requirement.
- Calendar work is using the existing `Class` and `BonusClass` records; no schema change is planned.
- `Class.startTime` is optional, so matching classes without a time are shown in a separate list rather than silently omitted.
- The existing staff calendar range is 07:00–22:00 in 30-minute rows; event duration is displayed, but the first increment does not resize rows.
- Static workflow tests read route source files directly; after moving the reception calendar body into a shared component, the tests now inspect that component and the new role routes.
- Reception class lookup did not select or display `startTime`; the calendar increment adds it so schedule answers include the actual time.

## Questions for review

None yet.

## End-of-session summary

- Deviations: 0 from the approved plan.
- Most likely to revisit: the exact number of shortcuts shown in the admin topbar.
- Edge cases found: public pages use default light/PT-BR settings; mobile shortcuts scroll horizontally.
- Verification: typecheck, 20 static workflow tests, production build, desktop/mobile browser smoke check, and no browser console errors passed.
- Next session should read first: this file, `docs/FEATURES/dashboard.md`, and the shared topbar/global stylesheet.

## Calendar build summary

- Deviations: 0 from the approved calendar plan.
- Most likely to revisit: staff views may later need a weekly all-teacher mode or a wider time range.
- Edge cases found: optional class times, UTC-normalized dates, canceled bonus classes, and static tests targeting route source files.
- Verification: typecheck, Prisma validation, 20 critical workflow tests, production build, and diff checks passed.
- Next session should read first: this file, `src/lib/calendar.ts`, and `src/app/components/staff-calendar-page.tsx`.
