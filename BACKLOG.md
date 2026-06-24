# Product Backlog

## Now

- Confirm Git branch and commit workflow.
- Scaffold the Next.js application.
- Add setup instructions to the README.
- Decide whether development database will be local PostgreSQL, Docker PostgreSQL, or hosted PostgreSQL.

## Next

- Add Prisma schema.
- Add seed data.
- Add email/password authentication.
- Add teacher dashboard.
- Add class record entry page.
- Add admin review page.

## Later

- Add Sponte API credentials.
- Review Sponte API authentication flow.
- Map local records to Sponte endpoints.
- Add manual sync.
- Add sync logs.
- Add retry failed sync.
- Add CSV export backup.
- Add tests for teacher access control.
- Add tests for class record submission.

## Open Questions

- Does each paper class record map to a Sponte lesson, turma, aula, or another object?
- Does Sponte track homework completion directly, or does it need to be stored as an observation/occurrence?
- Should an admin approve records before sync?
- Should teachers be able to edit a submitted record?
- What should happen when a class has a substitute teacher?
- Does the school need Portuguese, English, or bilingual UI labels?
- Should the app eventually import students/classes from Sponte instead of manual creation?

## Learning Goals

- Learn Git branches, commits, and pull requests.
- Learn how to break a product into sprints.
- Learn how to build a full-stack web app.
- Learn authentication and access control.
- Learn database modeling.
- Learn safe third-party API integration.
- Learn how to handle sync failures without losing data.
