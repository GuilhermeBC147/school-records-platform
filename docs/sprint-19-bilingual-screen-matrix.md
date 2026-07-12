# Sprint 19 Bilingual Critical-Screen Matrix

Test date: 2026-07-12
Environment: local Next.js application with seeded PostgreSQL data

## Result key

- **Pass**: visible content, navigation, locale persistence, and relevant interaction behaved as expected.
- **Fail**: a reproducible localization or runtime defect was observed.

## Matrix

| Role | Route or workflow | English | Brazilian Portuguese | Evidence |
| --- | --- | --- | --- | --- |
| Public | `/login` locale links and form | Pass | Pass | Headings, field labels, password-recovery link, and development-account help switched through URL locale links. |
| Admin | `/dashboard` and signed-in locale persistence | Pass | Pass | Navigation, overview cards, personal-slot callout, and locale preference persisted across direct navigation. |
| Admin | `/admin/records` | Pass | Pass | Submitted-record heading, navigation, filters, and record content rendered with the selected locale. |
| Admin | `/admin/risk` | Pass | Pass | Risk heading and default-rule presentation rendered in both locales. |
| Admin | `/admin/students/import` | Pass | Pass | Import heading, upload controls, template action, recent-import table, and statuses rendered in both locales. |
| Admin | `/admin/classes/import` | Pass | Pass | Import heading, CSV requirements, upload controls, recent-import table, and statuses rendered in both locales. |
| Admin | `/admin/calendar` | Pass | Pass | Week navigation, filters, weekday labels, event types, and grouped-event summaries rendered in both locales. |
| Teacher | `/dashboard` | Pass | Pass | Navigation, date/day filters, class metadata, empty state, and overview labels rendered in both locales. |
| Teacher | assigned class detail and grades | Pass | Pass | Class navigation, roster, recent lessons, grades, edit, and save controls rendered in both locales. |
| Teacher | `/dashboard/bonus-classes` | Pass | Pass | Date filters, assigned-class section, navigation, and empty content rendered in both locales. |
| Teacher | `/dashboard/calendar` | Pass | Pass | Week navigation, calendar filters, event presentation, and headings rendered in both locales. |
| Reception | `/reception` | Pass | Pass | Dashboard navigation, overview labels, schedule section, and empty state rendered in both locales. |
| Reception | `/reception/bonus-classes` | Pass | Pass | Scheduling form, calendar link, and recent-class section rendered in both locales. |
| Reception | `/reception/calendar` | Pass | Pass | Week navigation, calendar filters, event presentation, and headings rendered in both locales. |
| Reception | admin-route access boundary | Pass | Pass | Direct navigation to `/admin/records` redirected to `/reception` in either locale. |

## Defects

No localization defects were found in this matrix. Browser console error logs were empty after the pass.

The development server returned one transient `500` for `/admin/classes/import` with a stale Turbopack module-factory error during the first English navigation. A direct reload returned `200`, the complete screen rendered, and subsequent English and Portuguese checks passed. The production build also passed, so this is recorded as a development-cache observation rather than a product failure.

The environment setup exposed a separate follow-up: `npm.cmd run db:seed` returned Prisma `P2002` on an existing `id`, so the seed is not fully repeatable against an already-populated development database. Existing demo data was used without resetting the database.

## Test-data cleanup

- Admin remained in its original Brazilian Portuguese preference.
- Teacher 1 and Reception 1 were returned to their original English preferences after testing.
- No records, imports, schedules, grades, or attendance entries were created or changed.
