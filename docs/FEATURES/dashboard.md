# Dashboards

The public `/` page introduces the platform and links to sign-in without
requiring an authenticated session. Signed-in pages keep the shared green and
blue visual system with light and dark account themes.

The dashboard redirects users into role-specific workflows:

- Teachers see their active assigned classes, default weekday filtering, recent
  records, grades, work summaries, bonus classes, substitute workflows, and a
  weekly calendar for their recurring classes, bonus classes, and included
  admin-created meetings.
- Admins see account, class, student, record, grade, risk, import, substitution,
  work-summary, and all-teacher calendar entry points. Calendar events open the
  existing protected class or bonus-class edit workflows. Admin-created meetings
  appear as one card per meeting, with the included teacher names combined on
  the card.
- Reception sees bonus scheduling, a combined Monday-to-Sunday class and
  bonus-class calendar with admin-created meetings, student lookup, and class
  lookup.

All signed-in dashboards also expose role-aware shortcut navigation in the
shared topbar. Teachers and reception keep one direct-link row. Admins get a
core workflow row for dashboard, calendar, classes, students, and records,
plus a second row grouping management, work, operations, and account tools.
Each admin row stays horizontally scrollable with a visible overflow
affordance, while the dashboard cards continue to provide contextual actions
and status information.

Dashboard text and date/time labels use the signed-in account's locale and date
format. Account theme preferences apply across the application.

Calendar views project existing records rather than creating a new event table.
Active classes repeat on their configured weekdays, while non-canceled bonus
classes appear on their scheduled dates, and admin-created meeting work logs
appear on the selected teachers' scheduled dates. Classes without a start time remain in
an unscheduled list instead of the 07:00–22:00 time grid. In admin and reception
views, events with the same day and start time are grouped into an expandable
card so the week remains scannable without hiding any class details. Event cards
show the current class book, teacher, and class metadata, and use their duration
to occupy the matching timeline height. Partially overlapping events are placed
in separate lanes within the day column. The shared calendar board fits the
available panel width and uses contained horizontal scrolling on narrow screens.
Its weekday header stays sticky during vertical scrolling, with the header and
event grid kept horizontally aligned on touch devices.
Meetings without a start time are retained in the same unscheduled list.
The admin calendar collapses the per-teacher meeting records produced by the
admin meeting workflow so the same meeting is not repeated once per teacher.
