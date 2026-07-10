# Dashboards

The public `/` page introduces the platform and links to sign-in without
requiring an authenticated session. Signed-in pages keep the shared green and
blue visual system with light and dark account themes.

The dashboard redirects users into role-specific workflows:

- Teachers see their active assigned classes, default weekday filtering, recent
  records, grades, work summaries, bonus classes, substitute workflows, and a
  weekly calendar for their recurring and bonus classes.
- Admins see account, class, student, record, grade, risk, import, substitution,
  work-summary, and all-teacher calendar entry points. Calendar events open the
  existing protected class or bonus-class edit workflows.
- Reception sees bonus scheduling, a combined Monday-to-Sunday class and
  bonus-class calendar, student lookup, and class lookup.

All signed-in dashboards also expose a compact, role-aware shortcut row in the
shared topbar. It provides direct links to the most common workflows while the
dashboard cards continue to provide contextual actions and status information.

Dashboard text and date/time labels use the signed-in account's locale and date
format. Account theme preferences apply across the application.

Calendar views project existing records rather than creating a new event table.
Active classes repeat on their configured weekdays, while non-canceled bonus
classes appear on their scheduled dates. Classes without a start time remain in
an unscheduled list instead of the 07:00–22:00 time grid. In admin and reception
views, events with the same day and start time are grouped into an expandable
card so the week remains scannable without hiding any class details. Event cards
show the current class book, teacher, and class metadata, and use their duration
to occupy the matching timeline height. Partially overlapping events are placed
in separate lanes within the day column. The shared calendar board fits the
available panel width and uses contained horizontal scrolling on narrow screens.
