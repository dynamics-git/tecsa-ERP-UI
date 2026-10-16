# SaaS S2-A: Laravel-backed login and company selection

## Deployment state

Angular `/welcome` and `/start` are preview routes; they do not create users, send OTP or issue trial subscriptions.

The authenticated ERP login uses these Laravel 12 routes:
- `POST /api/v1/auth/login` — password verification, user, Sanctum token, authorized companies, default company.
- `GET /api/v1/auth/context?companyId={UUID}` — authenticates the token, verifies active company membership and returns explicitly registered page permissions.
- `POST /api/v1/auth/logout` — revokes the active token.

Frontend permission hints are fail closed. Business route authorization remains on the Laravel server.

## Local run (separate backend/frontend processes)

1. Use the dedicated **development** PostgreSQL database, never a production database. Do not run seeding until the connection is verified.
2. Start Laravel from the existing `tecsa-erp-26.0` checkout, for example `php artisan serve --host=127.0.0.1 --port=8000`.
3. Start Angular with `npm start`. The development proxy forwards `/api/*` to `http://127.0.0.1:8000`.
4. Open `/auth/login` in the Angular development server.

## SaaS deployment requirement

Angular production uses the full HTTPS ERP Laravel API URL from the GitHub Actions repository variable `ERP_API_BASE_URL`, injected into `src/environments/environment.ts` before FTP deployment. The public URL must end in `/api/v1` (including any actual server prefix). Do **not** substitute the separate TecSA Platform API URL or guess an ERP hostname. Set Laravel's `CORS_ALLOWED_ORIGINS` for the ERP frontend HTTPS origin. FTP upload of Angular files alone does **not** deploy Laravel.

Do not launch customer-facing login until the backend change is deployed and the actual origin, HTTPS, API proxy, authentication and company isolation are tested in a browser. The existing `.github/workflows/deploy-frontend-ftp.yml` has intentionally not been modified.

## Company selection and access control

An authenticated user with one company (or a backend-assigned default) enters it automatically after membership verification. A user with multiple companies but no default selects a company first. An account with no active company does not obtain an application session.

Laravel `AuthController::context` exposes the initial explicit mapping for `purchase-order` to `purchase_orders`. New pages must register their own intentional resource mapping and be tested rather than inferred from URL labels. The client no longer treats an `admin@...` email as SUPER or treats missing permissions as a grant.

## Outstanding before production SaaS

- The frontend currently uses bearer-token persistence inherited from the previous SessionService. Complete a dedicated session threat model, including browser storage / XSS / CSRF choices and token renewal.
- Registration, email OTP, tenant/org separation, billing and 30-day trial provisioning are **not yet implemented**.
- Only the purchase-order frontend permission snapshot is mapped. Additional pages and full ERP backend API integration remain future slices.
- Validate actual backend deployment, proxy, CORS, session expiry and logout with seeded development users in a real browser.
