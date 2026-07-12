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

## Signed-in locale toggle and topbar cleanup

### Deviations

- The login page uses URL links, but the signed-in toggle submits the existing locale action so the account preference persists and the user returns to the current path.

### Discovered edge cases

- The shared locale link class also styles login links, so signed-in buttons need explicit transparent-button resets while preserving the same compact visual treatment.
- At narrow widths, locale and sign-out controls must remain a single flex row; the topbar action layout was adjusted from the previous mobile column layout.

### Questions for review

None.

### End-of-session summary

- Deviations: 1 conservative implementation difference from the login reference: persisted action buttons instead of URL-only links.
- Most likely to revisit: the topbar action spacing if additional account controls are added later.
- Edge cases found: current-path redirects preserve nested routes and query strings; active locale remains exposed through `aria-current` and `aria-pressed`.
- Verification: 20 critical workflow tests, typecheck, production build, diff checks, and mobile/nested-route in-app browser smoke checks passed.
- Next session should read first: this section, `src/app/components/app-topbar.tsx`, and the topbar rules in `src/app/globals.css`.

## Personal booth scheduling

### Deviations

- The original plan derived every occupant from a one-student `Class`. The clarified requirement includes one-off reviews, make-up lessons, and tests for any student, so an additive dated `PersonalSlotBooking` model is used instead.

### Discovered edge cases

- Existing recurring `PERSONAL` classes and ad-hoc bookings consume the same three-booth capacity.
- Different activities can partially overlap, so payroll uses the union of completed/submitted personal intervals rather than grouping identical start times.

### Questions for review

- Confirm after trying the workflow whether physical booths need stable names/numbers; this increment treats them as interchangeable capacity.

### End-of-session summary

- Deviations: 1, the additive booking model described above.
- Most likely to revisit: whether booth identities should be stored.
- Edge cases found: recurring/ad-hoc shared capacity and partial-duration overlap.
- Verification: Prisma generation, schema validation, typecheck, and critical workflow tests.
- Next session should read first: this section, `src/lib/personal-slots.ts`, and `src/lib/teacher-work.ts`.

## Personal booth follow-up

### Deviations

- None. The follow-up exposes the existing authorized workflow directly on the admin dashboard and localizes its page/calendar presentation.

### Discovered edge cases

- Permission alone did not make the feature discoverable to admins; both the dashboard and grouped operations navigation need direct entry points.
- Booking purposes remain staff-entered free text and are intentionally not translated after they are saved.

### Questions for review

- None.

### End-of-session summary

- Deviations: 0.
- Most likely to revisit: whether personal-slot status controls should also appear directly in calendar cards.
- Edge cases found: admin discoverability and user-entered purpose localization boundaries.
- Verification: typecheck and critical workflow tests.
- Next session should read first: this section and `src/app/reception/personal-slots/page.tsx`.

## Personal booth calendar and teacher confirmation

### Deviations

- None from the approved plan. Existing bonus-class attendance terminology and confirmation metadata were reused.

### Discovered edge cases

- Staff calendar columns represent dates, so the personal grouping key must include `teacherId` to avoid merging different teachers who start bookings at the same time.
- Admin/reception completion sets a booking to Present; teacher confirmation supports the full Present, Absent, and Excused set.

### Questions for review

- None.

### End-of-session summary

- Deviations: 0.
- Most likely to revisit: whether broad mixed-event groups need a different summary treatment after staff use.
- Edge cases found: same-time bookings for different teachers, partial overlaps with different durations, and manager versus teacher confirmation semantics.
- Verification: migration deploy, Prisma generation, typecheck, critical workflow tests, and diff checks.
- Next session should read first: this section, `src/app/components/calendar-grid.tsx`, and `src/app/dashboard/personal-slots/page.tsx`.

## Teacher dashboard date-filter redesign

### Deviations

None yet.

### Discovered edge cases

- Sunday is intentionally excluded from recurring class results even if a malformed or future record contains `SUNDAY`; dated personal bookings remain independently visible for a selected Sunday.
- Personal booking confirmation must preserve the selected dashboard date when redirecting back after the server action.
- The existing full-card class link cannot contain the personal attendance form, so personal cards need a non-link card shell.

### Questions for review

None yet.

### End-of-session summary

- Deviations: 0 from the approved dashboard redesign; the legacy route is a redirect-only compatibility path as planned.
- Most likely to revisit: whether teachers want a month-level personal-booking overview in addition to the exact-date dashboard view.
- Edge cases found: Sunday date views omit recurring classes, weekday mode intentionally shows no dated personal bookings, and confirmation redirects preserve the selected date.
- Verification: `npm.cmd test` (21 passed), `npm.cmd run typecheck`, `npm.cmd run build`, and `git diff --check` passed.
- Next session should read first: this section, `src/app/dashboard/page.tsx`, and `docs/FEATURES/dashboard.md`.

## Sprint 19 quality-control baseline

### Deviations

- The first branch was created from `main`, but the production build showed that `main` does not contain the completed Sprint 18 imports, calendars, or personal-slot routes. The branch was recreated from `codex/class-cards-and-personal-redesign`, and all checks were rerun against the full platform.

### Discovered edge cases

- A direct typecheck can read stale `.next` route declarations after switching between branches with different route trees; the authoritative result is the clean full-feature rerun plus production build.
- The static workflow suite validates source patterns, not browser behavior or PostgreSQL writes.
- Sprint 19 currently depends on the unmerged personal-dashboard branch; its PR must merge first or this PR must be retargeted after the dependency lands.

### Questions for review

- None. The known regular-class overlap warning remains a separate launch blocker rather than being folded into this audit PR.

### End-of-session summary

- Deviations: 1 branch-base correction; no product implementation deviation.
- Most likely to revisit: whether the QC report should become a signed release artifact once manual tests begin.
- Edge cases found: stale generated route declarations, static-test limitations, and an unmerged branch dependency.
- Verification: 21 critical workflow tests, typecheck, Prisma validation, and production build passed.
- Next session should read first: this section and `docs/sprint-19-quality-control.md`.

## Sprint 19 bilingual critical-screen testing

### Deviations

- None yet.

### Discovered edge cases

- PR #48 merged into PR #47's branch after PR #47 had already merged into `main`; this branch starts from the PR #48 merge commit so the QC report and handoff remain present.
- Signed-in locale changes persist on the seeded account, while the public login locale is URL-based and does not change account preferences.
- `npm.cmd run db:seed` is not repeatable against the current populated database: Prisma reports `P2002` on the `id` unique constraint. Testing continues with existing demo data to avoid a destructive reset.
- The first English request to `/admin/classes/import` hit a transient stale Turbopack module-factory `500`; reloading returned `200`, later bilingual checks passed, and the production build succeeded.

### Questions for review

- None yet. Any defect that expands into scheduling, authorization, or database behavior will pause for a switch to High reasoning.

### End-of-session summary

- Deviations: 0 from the browser matrix; the test used existing data after the non-repeatable seed command failed.
- Most likely to revisit: add validation-message and success-message interaction cases when each workflow receives database-backed testing.
- Edge cases found: stacked PR merge ordering, per-account locale cleanup, Playwright button timeouts on long pages, a transient development-cache error, and non-idempotent seed data.
- Verification: public, admin, teacher, reception, locale-persistence, and reception access-boundary checks passed in English and Brazilian Portuguese; browser console errors were empty.
- Next session should read first: this section and `docs/sprint-19-bilingual-screen-matrix.md`.

## Sprint 19 PostgreSQL import testing

### Deviations

- The browser-control surface does not expose a reliable file-upload API, so the database pass uses the real import preview/confirm functions through an opt-in integration test instead of automating the OS file picker.

### Discovered edge cases

- Preview is intentionally a database write because it persists audit batches and row-level results before confirmation.
- Integration fixtures need unique names and identifiers plus `finally` cleanup so repeated runs do not become their own duplicate inputs.
- The repository compiles test files as CommonJS, so integration module loading belongs in `test.before`; top-level `await` fails before any fixture is written.

### Questions for review

- None yet. `tsx` is added as a development-only runner; the default source-level test command remains database-independent.

### End-of-session summary

- Deviations: 1 test-surface adjustment from browser upload to direct integration coverage of the production import functions.
- Most likely to revisit: whether the PostgreSQL integration command should become a required CI service job.
- Edge cases found: preview writes audit data, fixtures must self-clean, and CommonJS tests cannot use top-level `await`.
- Verification: student and class valid/invalid/duplicate/partial-failure scenarios passed twice consecutively with exact audit-count and persistence assertions.
- Next session should read first: this section, `tests/import-workflows.integration.test.ts`, and `docs/sprint-19-import-quality-control.md`.
