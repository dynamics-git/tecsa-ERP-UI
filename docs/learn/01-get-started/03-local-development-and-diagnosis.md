# Run locally and diagnose errors

Use the local UI with its configured ERP API. A timeout or route error is not a reason to deploy unfinished changes or point at an unrelated remote backend.

## Start the right services

Install the UI lockfile dependencies and run the existing launcher. It generates feature discovery and documentation before starting Angular.

```sh
npm ci
npm start
```

Run the Laravel ERP backend using the configured local host/port or the existing web server. Check the development environment's API base URL and ensure the running process is that ERP repository, not the separate Platform application. Do not change URLs by trial and error while diagnosing a contract failure.

## Database schema

After adding migrations, apply reviewed migrations to the intended development database. Do not reset, reseed or recreate a database just to open a page. Existing installations may contain user and permission data that must be migrated safely.

## Inspect the actual failed request

Use browser Network and the backend log to identify endpoint, method, status and elapsed time. A blank grid can be an empty successful result, a route mismatch, failed authorization or a timeout; those require different corrections.

| Symptom | Check first |
| --- | --- |
| Route not found | Published source name, flat endpoint and company/workspace path |
| Parent does not belong | Selected-row business mapping and complete relationship filter |
| Unauthorized | Login/session and company membership |
| Forbidden | Effective resource/page/field permission and system-owned restrictions |
| Internal error | Matching Laravel exception, migration state and database constraints |
| Timeout | Actual API/server/database request path; do not just lengthen the UI timer |
| Empty valid response | Business filter, company scope and actual stored rows |

## Do not hide failures in presentation

Keep the shared error visible and retain drafts. Do not remove field types, replace a missing backend read with mock rows or add a manual Save button to avoid the error. Correct the contract at the layer that owns it.

## Verify only what was actually checked

Use targeted tests for the changed behavior, then the appropriate build/lint/regression checks. Record separately whether real browser interaction was verified. A tool access denial is not proof of an ERP permission error, and a passing HTTP check is not a visual check.
