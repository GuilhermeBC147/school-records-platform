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
update these preferences from `/dashboard/account`; the signed-in language
selector is grouped with the other account settings instead of the global
topbar. Filter fields display the account date format while still submitting
ISO date values for server-side queries and database consistency. The
supported locales are English and Brazilian Portuguese, with Brazilian
Portuguese as the default. The supported themes are light and dark, with
light as the default.

## Password Reset

Admins, teachers, and reception staff can start password recovery from:

```text
http://localhost:3000/forgot-password
```

Reset tokens are stored as hashes in the database and expire after 30 minutes.

In development, the reset request page displays a reset link so the workflow can be tested without an email provider.

In production, the app sends the reset link through the school-owned Hostinger mailbox and never displays the token in the browser. The public result stays the same whether the account is active, inactive, unknown, or SMTP delivery later fails.

## Production Email Requirement

The application uses a dedicated Hostinger Email mailbox for low-volume password-reset messages. The saved account locale selects English or Brazilian Portuguese email copy. Delivery runs after the generic response, and failures emit only a fixed operational signal without logging the recipient, token, password, or SMTP error.

Configure the application with:

- SMTP host `smtp.hostinger.com`;
- port `465` with SSL, or `587` with STARTTLS;
- the full mailbox address as the username;
- an app password if the mailbox supports one;
- credentials stored only in the VPS environment configuration.

The protected production variables are `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. `APP_URL` must be the final HTTPS origin without a path. Use port 465 with `SMTP_SECURE=true`, or port 587 with `SMTP_SECURE=false`; the latter configuration requires STARTTLS.

Before launch, verify the sender address, SPF/DKIM/DMARC configuration, delivery to common providers, and the password-reset link. If deliverability is inadequate, use a dedicated transactional email provider without changing the reset workflow.

The email should include only the reset link and its expiry window. It should not include the user's current password.

## Session requirement

Authentication sessions are signed with `AUTH_SECRET`. Set a strong local value
in `.env.local`, and use a different long random value in production.

## Production password-reset delivery status

The application currently creates a cryptographically random reset token, stores only its hash, expires it after 30 minutes, and keeps the public response generic whether or not an active account exists. Development-only flows can reveal the token for safe local testing; production never does.

Production email delivery is implemented with an isolated mail transport and fake-transport tests for both locales, unknown/inactive accounts, safe failures, explicit URLs, token hashing, and expiry. This local evidence does not prove the school mailbox or DNS. Launch remains blocked until the school configures the protected variables, verifies SPF, DKIM, and DMARC, and records successful real delivery and reset-link use. Hostinger documents that its email servers support SMTP and that SPF/DKIM/DMARC protect deliverability and spoofing; see its [SMTP support](https://www.hostinger.com/support/1583644-does-hostinger-support-pop3-imap-and-smtp/) and [DNS guidance](https://support.hostinger.com/en/articles/1583250-what-dns-record-types-are-supported-at-hostinger).
