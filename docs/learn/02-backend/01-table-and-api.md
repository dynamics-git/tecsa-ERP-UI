# Create a table and its API

For an ordinary table without custom business rules, create three backend files: Migration, Model and API Controller. Shared core supplies the CRUD runtime; the migration supplies the real database contract.

## 1. Migration

This complete example adds four business fields: code, description, active and starting date. System and company columns are infrastructure fields. It uses PostgreSQL-compatible Laravel schema declarations already used by this backend.

```php
<?php

use App\Support\SystemFields;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('samples', function (Blueprint $table) {
            SystemFields::columns($table);
            $table->uuid('company_id');
            $table->string('code', 30);
            $table->string('description', 150);
            $table->boolean('is_active')->default(true);
            $table->date('starting_date')->nullable();
            $table->unique(['company_id', 'code']);
            $table->foreign('company_id')
                ->references('system_id')->on('companies');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('samples');
    }
};
```

`SystemFields::columns` provides `system_id`, created/modified timestamps and actors, and the row version. Do not add a second ordinary `id` merely to identify the same record. Audit values are maintained by the shared lifecycle, not trusted from the request.

Use lengths, nullability, defaults, decimal scale and constraints that reflect the domain. If a business key is company-specific, its unique constraint must include company scope. Add a corresponding FK when a child depends on it.

## 2. Model

```php
<?php

namespace App\Models;

use App\Models\Concerns\HasEntityDefinition;

class Sample extends BaseModel
{
    use HasEntityDefinition;

    protected string $entityName = 'samples';
}
```

The naming convention resolves the `samples` table. Use an explicit table override only for a real naming exception. An ordinary schema-backed model does not repeat every database column in handwritten `fillable`, casts or a second entity field list.

`HasEntityDefinition` now obtains storage fields, defaults and physical casts from
the existing schema resolver. Public API write/exposure flags remain separate from
trusted service assignments. An internal model can use the same trait without an
API source; an internal model must not gain a public API merely to read its schema.
Keep deliberate behavior casts such as password hashing and encryption.

The same ordinary CRUD runtime supports the existing authenticatable User and
explicitly global Companies API. A company-scoped URL still requires verified
company access. No new Company copy/delete feature is included in this cleanup.

This is the ordinary API authoring path. Document adapters retain schema-mapped
values alongside their business initialization. Explicit command inputs, such as
source lines to invoice or quantities to post, still belong to the service;
adding a column does not invent new posting behavior. Behavioral verification of
the current cleanup is deferred.

## 3. API controller

```php
<?php

namespace App\Http\Controllers;

use App\Models\Sample;
use App\Support\Entities\ApiSource;

#[ApiSource(Sample::class)]
class SampleController extends EntityController {}
```

`ApiSource` is the controller declaration shared discovery reads. It is not a command the UI publishes and not a second entity registration. The model name convention yields `samples` as the API source name.

## Standard routes

```http
GET    /api/v1/companies/{companyId}/samples
GET    /api/v1/companies/{companyId}/samples/{systemId}
POST   /api/v1/companies/{companyId}/samples
PATCH  /api/v1/companies/{companyId}/samples/{systemId}
DELETE /api/v1/companies/{companyId}/samples/{systemId}
```

No ordinary manual route entry, request class, resource class, CRUD service, entity PHP registration or list-query map is required. A deliberate domain action or unusual integration can need additional code; that does not change the ordinary pattern.

## API fields

Database `starting_date` is exposed as `startingDate`, `is_active` as `isActive`, and `system_id` as `systemId`. UI config uses public API field names, not raw storage column names.

```json
{
  "code": "SAMPLE-01",
  "description": "Example record",
  "isActive": true,
  "startingDate": "2026-10-31"
}
```

## What shared core provides

Shared source metadata powers filtering, sorting, pagination and ordinary write validation. Shared record routes support Notes and Attachments for the published source. Authorization and company/workspace context still apply; table creation alone does not grant every user access.

Continue with [API queries and writes](/documentation/backend/queries-and-concurrency), then [create its page](/documentation/frontend/page-pattern).
