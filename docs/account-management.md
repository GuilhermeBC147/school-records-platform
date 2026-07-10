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

Each account also stores a preferred date format, locale, and theme. Staff can
update these preferences from `/dashboard/account`; filter fields display the
account date format while still submitting ISO date values for server-side
queries and database consistency. The supported locales are English and
Brazilian Portuguese, with Brazilian Portuguese as the default. The supported
themes are light and dark, with light as the default.

## Password Reset

Admins, teachers, and reception staff can start password recovery from:

```text
http://localhost:3000/forgot-password
```

Reset tokens are stored as hashes in the database and expire after 30 minutes.

In development, the reset request page displays a reset link so the workflow can be tested without an email provider.

In production, the app should send the reset link through a school-approved email provider instead of displaying it in the browser. The database model and reset page are ready for that email delivery step.

## Production Email Requirement

The current plan is to use a dedicated Hostinger Email mailbox for low-volume password-reset messages. The current development flow exposes the reset token in the response for testing, so production must replace that path with real email delivery before launch.

Configure the application with:

- SMTP host `smtp.hostinger.com`;
- port `465` with SSL, or `587` with STARTTLS;
- the full mailbox address as the username;
- an app password if the mailbox supports one;
- credentials stored only in the VPS environment configuration.

Before launch, verify the sender address, SPF/DKIM/DMARC configuration, delivery to common providers, and the password-reset link. If deliverability is inadequate, use a dedicated transactional email provider without changing the reset workflow.

The email should include only the reset link and its expiry window. It should not include the user's current password.

## Session requirement

Authentication sessions are signed with `AUTH_SECRET`. Set a strong local value
in `.env.local`, and use a different long random value in production.
