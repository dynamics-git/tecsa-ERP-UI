# Local ERP development

The ERP application and Platform administration are separate applications.

1. Start the ERP Laravel API from `C:/xampp/htdocs/tecsa-erp-26.0`:

   ```powershell
   C:\xampp\php\php.exe artisan serve --host=127.0.0.1 --port=8002
   ```

2. Start ERP Angular from this repository with `npm start`.
3. Open `http://localhost:4200/auth/login` and sign in with an existing ERP account.

`src/environments/environment.development.ts` owns the explicit ERP API URL:
`http://127.0.0.1:8002/api/v1`. It must point to ERP Laravel, never Platform Laravel.
Port 8002 avoids the local Platform API on 8000/8001. Apache can serve ERP instead:
replace that one environment URL with the ERP Apache URL.

The ERP login retains Laravel Bearer authentication, authorized company selection
and existing company permissions. Restoring its presentation does not create
users, companies or trial registrations. No database reset or seeder is needed.

For this checkout, Laravel uses `CACHE_STORE=file` locally because the existing
ERP database has no Laravel `cache` table. Login throttling remains enabled.
The backend `.env` is private and must not be committed. Do not use placeholder
`ERP_ADMIN_EMAIL` / `ERP_ADMIN_PASSWORD` values as login credentials; authentication
checks the existing user table.
