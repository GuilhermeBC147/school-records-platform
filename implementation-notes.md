# Implementation notes

## Deviations

No deviations from the approved plan yet.

- 2026-07-10 calendar build started: preserving the existing notes from the prior landing-page build and adding calendar decisions below.
- The approved plan used a selected-date teacher-column staff grid; the user requested a Monday-to-Sunday shared week view instead, so admin and reception now use the existing week-mode grid with teacher names on event cards. This remains reversible through the shared `CalendarGrid` mode.

## Discovered edge cases

- The public page has no signed-in account preference, so it intentionally uses the existing unauthenticated light theme and default locale.
- Admin shortcuts are denser than teacher or reception shortcuts; the mobile row uses horizontal scrolling with full-size touch targets.
- The existing root layout still resolves the current user to apply account theme preferences, but the new landing page itself has no authentication requirement.
- Calendar work is using the existing `Class` and `BonusClass` records; no schema change is planned.
- `Class.startTime` is optional, so matching classes without a time are shown in a separate list rather than silently omitted.
- The existing staff calendar range is 07:00–22:00 in 30-minute rows; event duration is displayed, but the first increment does not resize rows.
- Static workflow tests read route source files directly; after moving the reception calendar body into a shared component, the tests now inspect that component and the new role routes.
- Reception class lookup did not select or display `startTime`; the calendar increment adds it so schedule answers include the actual time.
- The admin/reception date field is now a reference date for the displayed Monday-to-Sunday week; previous/next week links preserve the selected teacher filter.
- Same-start events are grouped by exact `startTime` within each day cell; events at different minutes remain separate even when they share a 30-minute grid row.
- Duration now controls the positioned card height, and a small lane allocator places partially overlapping events side by side within the same day column.

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

## Calendar view adjustment summary

- Deviations: 1 user-approved change from the original plan: admin/reception staff view changed from daily teacher columns to a Monday-to-Sunday week grid.
- Most likely to revisit: whether the reference date should be replaced by a dedicated week picker.
- Edge cases found: teacher filters must persist across week navigation, and the teacher name is now repeated on event cards for all-teacher scanning.
- Verification: typecheck, 20 critical workflow tests, production build, and diff checks passed.
- Next session should read first: this file, `src/app/components/staff-calendar-page.tsx`, and `src/app/components/calendar-grid.tsx`.

## Calendar grouping summary

- Deviations: 0 additional deviations; grouping is a focused extension of the approved staff-calendar behavior.
- Most likely to revisit: whether grouped cards should also combine events with different minutes in the same 30-minute row.
- Edge cases found: grouping is exact-start-time based, while the grid itself remains 30-minute based.
- Verification: typecheck, 20 critical workflow tests, production build, and diff checks passed.
- Next session should read first: this file, `src/app/components/calendar-grid.tsx`, and the staff calendar feature documentation.

## Calendar duration and book summary

- Deviations: 0 additional deviations from the requested behavior.
- Most likely to revisit: grouped cards currently use the longest duration of their same-start events.
- Edge cases found: partial overlaps use side-by-side lanes; exact same-start events remain one expandable group.
- Verification: typecheck, 20 critical workflow tests, production build, and diff checks passed.
- Next session should read first: this file, `src/app/components/calendar-grid.tsx`, and the calendar styles in `src/app/globals.css`.

## Calendar layout polish summary

- Deviations: 0 additional deviations; the board now fits the panel at normal widths and uses contained horizontal scrolling on narrow screens.
- Most likely to revisit: the mobile minimum board width may need tuning if the calendar is later optimized for phone-sized screens.
- Edge cases found: opaque event backgrounds and elevated stacking keep timeline rules behind cards; grouped summaries reserve space for the expand icon.
- Verification: typecheck, 20 critical workflow tests, production build, and diff checks passed; the in-app browser could not connect to the local development server for a visual smoke check.
- Next session should read first: this file, `src/app/components/calendar-grid.tsx`, and the calendar styles in `src/app/globals.css`.
