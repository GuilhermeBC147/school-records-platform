# Sponte API Notes

## Official References

- Swagger UI: https://webservices.sponteweb.com.br/WSApiSponteRest/swagger/ui/index#/
- Integration portal: https://integracao.sponteweb.net.br/index.html

## Current Status

API credentials are not available yet. The first app version will manually create teachers, classes, and students locally. The Sponte integration will be designed as a later sprint after credentials and endpoint behavior are confirmed.

## Integration Strategy

The app should save all teacher submissions locally first. Sponte sync should be a separate step with its own logs and retry behavior.

This protects the school from data loss if:

- Sponte is unavailable.
- API credentials expire or are misconfigured.
- A payload is rejected.
- An endpoint behaves differently than expected.

## Expected Concepts to Confirm

- API authentication method.
- School/unit identification requirements.
- Teacher lookup or teacher external IDs.
- Class/group lookup or class external IDs.
- Student lookup or student external IDs.
- Lesson/session object used for attendance.
- Attendance submission endpoint.
- Homework completion endpoint or equivalent field.
- Whether records can be updated after submission.
- Error response format.
- Rate limits or request throttling.

## Local Data Needed for Future Sync

Local records should store:

- Local teacher ID.
- Future Sponte teacher ID.
- Local class ID.
- Future Sponte class/group ID.
- Local student ID.
- Future Sponte student ID.
- Lesson date.
- Attendance status.
- Homework completion status.
- Submission timestamp.
- Sync status.
- Last sync attempt timestamp.
- Last sync response or error.

## Safety Rules

- Never delete a local record because Sponte sync fails.
- Never overwrite a submitted record without an audit trail.
- Keep API keys in environment variables, not source code.
- Add a dry-run/manual review mode before real writes.
- Log enough information to diagnose failures without exposing secrets.
