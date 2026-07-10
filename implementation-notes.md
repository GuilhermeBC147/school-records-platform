# Implementation notes

## Deviations

No deviations from the approved plan yet.

## Discovered edge cases

- The public page has no signed-in account preference, so it intentionally uses the existing unauthenticated light theme and default locale.
- Admin shortcuts are denser than teacher or reception shortcuts; the mobile row uses horizontal scrolling with full-size touch targets.
- The existing root layout still resolves the current user to apply account theme preferences, but the new landing page itself has no authentication requirement.

## Questions for review

None yet.

## End-of-session summary

- Deviations: 0 from the approved plan.
- Most likely to revisit: the exact number of shortcuts shown in the admin topbar.
- Edge cases found: public pages use default light/PT-BR settings; mobile shortcuts scroll horizontally.
- Verification: typecheck, 20 static workflow tests, production build, desktop/mobile browser smoke check, and no browser console errors passed.
- Next session should read first: this file, `docs/FEATURES/dashboard.md`, and the shared topbar/global stylesheet.
