# Create a table and its API

## Current table-first phase — 5 November 2026

Required structure: **Individual Migration -> Model -> Individual Controller +
ApiSource -> existing Shared EntityController/Core CRUD**. Each table publishes
through its own thin named controller. The temporary consolidated table
controller and bulk publisher have been removed; API paths, policies, permission
rules and physical schema are unchanged by this organization correction.

The backend now uses individual readable creation migrations rather than a SQL
baseline loader. Normal CRUD still uses existing ApiSource + EntityController;
page Config/TypeScript/shared components are unchanged. Source fields and keys
come from PostgreSQL, not a duplicated API field list. Company storage and UUID
`systemId` remain. Conditional references are declarative column metadata checked
by the existing generic runtime; structural Header–Line relations also have
Company-aware SQL constraints. Table Object IDs are TecSA-owned metadata.

Draft purchasing uses `purchaseHeaders`/`purchaseLines`; draft sales uses
`salesHeaders`/`salesLines`. Document type and number identify the business
document inside each Company. Posted documents and entries remain separate.
Normal PR uses `purchaseRequisitions`/`purchaseRequisitionLines`, with
`lineType` + `number` for Item/G/L/Item Charge/Fixed Asset, and business Header–Line
binding through `documentType` + `documentNumber`. Existing page configurations
that use retired field/API names still require alignment in the next page phase.
Do not infer that old posting/approval buttons are available: those backend
commands are frozen while ordinary tables and pages are established.

Binary fields use base64 at the API, native time remains time, and structured
record references use JSON with TecSA `tableObjectId` + UUID `systemId`. This is
physical type support, not a new page renderer or a generic pricing/item system.

## Company storage

Native PostgreSQL `json`/`jsonb` fields use the backend's shared structured JSON
type and casts. Existing archive payloads can be discovered without breaking
Company login. JSON fields retain source read/write permissions and are excluded
from ordinary scalar filtering and sorting; no page-specific field list or
frontend JSON editor is introduced by this correction.

One migration/model/ApiSource definition describes a logical business table.
After backend storage cutover, Core provisions separate physical tables for every
Company inside its workspace database. Use existing CompanyData classification;
do not create per-Company controllers, model classes, field lists or UI configs.
The Company directory/security/session infrastructure remains shared. API URLs,
SystemId and business relationships are unchanged. New schema migrations run
through Laravel's coordinated Company storage path; custom data transformations
must use explicit Company context. See [Companies](/documentation/modules/companies).

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

Use lengths, nullability, defaults, decimal scale and constraints that reflect the domain. Existing composite business keys remain valid. In physical Company tables, a unique key is already local to that Company; do not invent another record identity. Add the real corresponding FK when a child depends on a business key.

## 2. Model

```php
<?php

namespace App\Models;

use App\Models\Concerns\HasEntityDefinition;
use App\Support\CompanyData;

#[CompanyData('master')]
class Sample extends BaseModel
{
    use HasEntityDefinition;

    protected string $entityName = 'samples';
}
```

The naming convention resolves the `samples` table. CompanyData classifies the table once for physical ownership and setup/master/full-copy scope; it is not a field list. Use an explicit table override only for a real naming exception. An ordinary schema-backed model does not repeat every database column in handwritten `fillable`, casts or a second entity field list.

`HasEntityDefinition` now obtains storage fields, defaults and physical casts from
the existing schema resolver. Public API write/exposure flags remain separate from
trusted service assignments. An internal model can use the same trait without an
API source; an internal model must not gain a public API merely to read its schema.
Keep deliberate behavior casts such as password hashing and encryption.

The same ordinary CRUD runtime supports the existing authenticatable User and
explicitly global Companies API. A company-scoped URL still requires verified
company access. Company provisioning/copy/delete use the storage contract described above.

This is the ordinary API authoring path. Document adapters retain schema-mapped
values alongside their business initialization. Explicit command inputs, such as
source lines to invoice or quantities to post, still belong to the service;
adding a column does not invent new posting behavior. Behavioral verification of
each storage or business change must be verified against its actual supported contract.

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

## Stage 4: shared write enforcement

Ordinary CRUD and SDK-published tables use the same EntityController,
EntityRuntime and EntityInput. PostgreSQL owns physical types, sizes, defaults,
nullability and constraints. The API source owns exposure/write policy; domain
services own exceptional business behavior. A domain input validator may narrow
validation, but cannot reopen a field whose source declares create/update false.
Explicit null on a prohibited/system field is rejected rather than silently omitted.

The write lifecycle is: authorize -> transaction and scoped locks -> normalize
supplied fields -> typed merged candidate -> existing business preparation and
determination -> physical/unique/reference and domain validation -> model save ->
afterWrite -> refresh. Audit and row-version handling remain shared. afterWrite
is inside the transaction; a failure rolls back the record changes.

PATCH omission preserves the previous value; explicit null is valid for nullable
writable columns. Trusted parent scope participates in validation and cannot be
changed by client payloads. Ordinary pages need no custom request/resource/CRUD
service. Document services retain their real aggregate initialization, numbering,
workflow and posting responsibilities. This checkpoint does not rewrite those
services or certify every unfinished business module.

## Stage 5: schema-column acceptance

The earlier Stage 5 bulk field-policy relocation was reverted. Do not use it as
a template for new APIs. An ordinary supported column added to a published table
needs no per-field controller, ApiSource, service or model declaration.

Acceptance fixtures prove this on an SDK table and existing PR header/line tables:
metadata, HTTP create/update/read, filter/sort, validation, defaults/nulls and
persistence use the new column automatically. Existing UUID record identity and
business document relationships remain unchanged. Source configuration snapshots
stay identical before/after adding the test columns.

Existing shared Core supplies this behavior; it was not replaced. Targeted command
input corrections reuse existing schema-derived patterns/rules for proven field
bindings. No field-policy lists, new metadata endpoint, CRUD engine or UI config
change is introduced. Full field shape is checked through existing Core metadata;
HTTP auth/context query metadata discovers the new field names.
