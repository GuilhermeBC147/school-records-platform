# Account Management Notes

## Staff Accounts

Admins manage teacher and reception accounts from:

```text
http://localhost:3000/admin/manage-accounts
```

Admins can:

- create teacher or reception accounts
- set an initial password
- edit account names, emails, and account type
- set a new password for an account
- activate or deactivate staff accounts

Inactive accounts cannot log in because login only accepts active users.

Each account also stores a preferred date format. Staff can update it from
`/dashboard/account`; filter fields display that account format while still
submitting ISO date values for server-side queries and database consistency.

## Password Reset

Teachers and admins can start password recovery from:

```text
http://localhost:3000/forgot-password
```

Reset tokens are stored as hashes in the database and expire after 30 minutes.

In development, the reset request page displays a reset link so the workflow can be tested without an email provider.

In production, the app should send the reset link through a school-approved email provider instead of displaying it in the browser. The database model and reset page are ready for that email delivery step.

## Production Email Requirement

Before production use, choose one password reset delivery path:

- hosting provider email integration
- SMTP account owned by the school
- transactional email provider

The email should include only the reset link and its expiry window. It should not include the user's current password.
