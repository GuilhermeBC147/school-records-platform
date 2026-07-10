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

## Admin meeting calendar projection

- Deviations: 0; the existing per-teacher MEETING work-log rows are reused as calendar events, so no schema change was needed.
- Most likely to revisit: reception meeting cards currently return to the reception calendar because reception has no work-log editor.
- Edge cases found: meetings without a start time are retained in the unscheduled list; selected-teacher filters apply to meetings as well as classes and bonus classes; admin cards collapse the per-teacher rows while reception retains teacher-specific meeting rows.
- Verification: typecheck, 20 critical workflow tests, production build, and diff checks passed.
- Next session should read first: this file, `src/app/components/staff-calendar-page.tsx`, and `src/app/dashboard/calendar/page.tsx`.

## Sticky calendar weekday header

- Deviations: 0; the shared calendar now separates its sticky weekday strip from the vertically long event grid without changing data or schema.
- Most likely to revisit: the mobile minimum board width may need tuning if the calendar is later optimized for phone-sized screens.
- Edge cases found: the header and body need synchronized horizontal scroll positions because the event grid retains contained mobile scrolling; the header remains sticky until the calendar shell ends.
- Verification: typecheck, critical workflow tests, production build, and mobile in-app browser smoke checks passed for admin and reception calendar routes.
- Next session should read first: this file, `src/app/components/calendar-grid.tsx`, `src/app/components/calendar-grid-scroll-sync.tsx`, and `src/app/globals.css`.

## Navigation and locale redesign

### Deviations

None yet.

### Discovered edge cases

- The expanded admin shortcut row is 1,635px wide at a 375px viewport; the right/left hint state makes the hidden links discoverable and the active shortcut is scrolled into view.
- Parent and nested shortcuts can both match a path, so only the longest matching route is marked active.
- Public locale selection is URL-based; signed-in document language follows the account, while public query-string content retains the root layout's unauthenticated default `lang` attribute.

### Questions for review

None yet.

### End-of-session summary

- Deviations: 0 from the approved plan.
- Most likely to revisit: the public page `<html lang>` remains the unauthenticated default when the locale is selected through a query string.
- Edge cases found: nested routes use the most-specific active shortcut; mobile overflow exposes hidden links; public locale selection is URL-based.
- Verification: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, and in-app browser smoke checks passed.
- Next session should read first: this section, `src/app/components/app-topbar.tsx`, and `src/app/globals.css`.

## Admin grouped navigation refinement

### Deviations

None.

### Discovered edge cases

- The admin layout needs separate scroll refs and overflow state for the core and grouped rows so each row keeps its own hint and active-item scrolling.
- The existing scroll-hint chevrons appeared encoding-corrupted in shell output; the refactor renders them with Unicode escapes so the source intent is unambiguous without changing the glyphs.
- Portuguese group labels are kept in the existing translation map and use escaped characters where needed to avoid source-encoding drift.

### Questions for review

None.

### End-of-session summary

- Deviations: 0 from the approved admin grouping plan.
- Most likely to revisit: the second admin row may need spacing or label-size tuning after extended mobile use.
- Edge cases found: each row needs independent overflow state; nested active routes remain most-specific; bilingual labels must stay no-wrap.
- Verification: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `git diff --check`, and desktop/mobile browser smoke checks passed; the browser console was clean.
- Next session should read first: this section, `src/app/components/app-topbar.tsx`, and the topbar rules in `src/app/globals.css`.

## Admin collapsible navigation refinement

### Deviations

- The grouped admin row changed from inline labeled links to native `<details>/<summary>` collapsible groups after mobile review found the labels and links too visually similar; the links remain inline in the second topbar row instead of overlaying the page.

### Discovered edge cases

- The most-specific active route must open its containing group so nested work-summary routes remain discoverable after client navigation.
- Sibling groups close when another group opens to keep the second row compact; the primary and grouped admin rows keep independent horizontal overflow state.
- The active group opens and scrolls into view after route changes, including nested work-summary routes.

### Questions for review

None.

### End-of-session summary

- Deviations: 1 user-requested interaction refinement from the previous grouped-navigation implementation.
- Most likely to revisit: whether group spacing or the active-group scroll position needs further tuning after extended mobile use.
- Edge cases found: active nested routes open the correct group; native summary controls preserve keyboard access; teacher and reception navigation remain unchanged.
- Verification: `npm.cmd test`, `npm.cmd run typecheck`, `npm.cmd run build`, `git diff --check`, and in-app browser checks at mobile and desktop widths passed; mouse, Enter, and Space group toggles worked and the browser console was clean.
- Next session should read first: this section, `src/app/components/app-topbar.tsx`, and the topbar rules in `src/app/globals.css`.
