# Extend business behavior without duplicating CRUD

Use the shared lifecycle for business rules. Add source options or model behavior only when the table's domain needs them; ordinary tables keep the three-file pattern.

## Source options

API source identity is explicit. Shared generated routes supply their own
`apiSource` defaults. A custom record/view route must bind the exact published
source it returns, including separate header, line and assignment sources:

```php
Route::get('postedPurchaseInvoices/{systemId}/lines', [PostedPurchaseInvoiceController::class, 'lines'])
    ->defaults('apiSource', 'postedPurchaseInvoiceLines');
```

This illustrates binding only; retain the existing company/workspace group,
parameter constraints and permission middleware. Core rejects missing source
bindings on published controllers instead of choosing a controller match.
Physical model validation reads the table schema independently of API views;
public input policies use their explicitly resolved source. One table may have
multiple views with different filtering, exposure and permissions.

Session/catalogue/aggregate DTOs that have no single record source use an explicit
null binding with a nonempty `apiSourceException` description. This is a reviewed
route contract, not a way to suppress an ambiguous record binding. Nested field
permissions remain a separate architecture checkpoint.

`ApiSource` supports explicit exceptions such as operations, field policies, unique validation, relationships, behaviors, numbering, query inclusion/exclusion and concurrency. Their purpose is to describe a real contract difference, not repeat every schema field.

```php
#[ApiSource(
    PermissionSet::class,
    companyColumn: null,
    options: [
        'operations' => [
            'read' => true,
            'create' => true,
            'update' => true,
            'delete' => false,
        ],
    ],
)]
```

This is a focused illustration of shared storage and a disabled delete operation, not the complete permission-set controller. Refer to that controller for its other policies and system-owned-record rules. Do not copy these restrictions to unrelated ordinary tables.

## Sensitive fields

### Exact field authority (checkpoint 2/7)

Each returned record uses its own published ApiSource. Nested lines and activities
use their child sources, including resource collections; a header field policy
does not describe its children. A command returning a posted record has a separate
input contract: its DTO is not authorized as editable posted-invoice fields.
Ordinary EntityInput checks supplied canonical fields. Existing command preparation
binds nested/aliased edits to their actual source fields, including supplied nulls.
Keep operation permissions and business validation as well as these field checks.

Notes/Attachments retain their owner-access and collaboration DTO contracts. Their
text, mention list and upload fields are not owner-record columns. User choices for
mentions/notifications separately respect readable User fields.

There are explicit limits. Undeclared calculated projections under source read
restrictions are omitted and named in `meta.fieldPolicyOmissions`. Typed child
resources keep their own policy. For independently configurable derived output,
declare a read-only virtual field through the existing ApiSource contract; do not
invent a second catalogue or infer permissions from JSON names. Reports without
field-level lineage reject restricted-source access with 403 rather than leaking
aggregate information. Existing command-only flags/selectors retain their operation
permissions and service validation, not an unrelated response field policy.

This checkpoint has database-free boundary checks, not full module/runtime
acceptance. No UI page configuration changes are needed. Checkpoint 3 remains
subject to independent review.

Passwords require write-only handling in the source contract and hashing in the
User model. The existing Users API supports password creation and changes;
UserService applies credential rules while shared Core supplies persistence,
uniqueness and concurrency. Hiding a password in a form or FactBox does not stop
an API response leaking it. Server field policies must prevent that exposure.

## Field validation hooks

Models using the shared validation lifecycle can register `onValidate` in their `booted` method. Storage field names are used here; UI field names are the public API names.

```php
protected static function booted(): void
{
    static::onValidate('description', function (self $record): void {
        $record->description = trim($record->description);
    });
}
```

For an explicit domain operation, `$record->validate('description', $value)` assigns and validates that field; save remains explicit. Ordinary API writes go through the shared saving lifecycle, which validates changed fields. Avoid cycles where field A repeatedly changes field B and B changes A.

## Header changes that affect existing lines

Copying a value during new-line initialization is different from changing all saved lines. A status transition that must update lines belongs in server business logic, within the same transaction. Scope the lines by the complete business relationship, validate each change as required by the domain, and save through the shared model lifecycle.

Do not use a UI loop of PATCH requests as the only implementation of an invariant. Partial network failure would leave inconsistent data. Do not assume bulk query updates dispatch model validation events.

## Entity behaviors

Ordinary table CRUD does not require a custom FormRequest, Resource or CRUD
service. Core reads physical field rules and maps public names to storage. The
current cleanup removes the custom Request layer; existing domain services keep
only operation-specific input checks and preparation. Those methods accept plain
data and create/update context. Moving a repeated schema rule into a service is
not an acceptable replacement for shared schema handling.

Response-only Resource wrappers use EntityResource directly. A distinct Resource
is justified for derived values or relationship output. Physical date/time output
uses the shared UTC JSON formatter; representation compatibility still needs
runtime verification in this cleanup.

The shared `EntityBehavior` contract offers `scope`, `beforeWrite`, `determine`, `validate` and `afterWrite` stages. A behavior can apply a domain rule without replacing generic controller CRUD. Use the actual interface signatures from the backend when implementing one; lifecycle callbacks are not interchangeable with UI save callbacks.

Existing hook signatures remain compatible. A concrete behavior for an
authenticatable Eloquent model may accept `Model` instead of `BaseModel`; a global
behavior may accept `?Company`. These are wider PHP parameter types. Empty inherited
base hooks are skipped by Core. Company-owned entities and company URLs still
require verified company context. The current implementation changes have not yet
been behaviorally verified; tests were deferred by the user.

## Posted and system-owned records

Disable unsupported operations on the API and reflect their capabilities in the page. A posted ledger can be a worksheet visually while its source is read-only. System-owned permission sets remain immutable where the domain policy requires it, even for a user who can read their rights.

## Future SDK packages

The backend also contains an integration provider example for package-based table publication. That is an advanced integration surface, not another registration required for ordinary controllers. The future SDK generator must emit the same supported contracts rather than creating a parallel CRUD architecture.

## Stage 5: command shape versus business behavior

Ordinary schema-column acceptance does not require a manual write-policy list.
The earlier policy-relocation implementation was reverted. Do not move old service
restrictions wholesale into controllers. Their business necessity requires evidence.

For a proven command-to-physical-field binding, use existing EntityRegistry field
metadata and EntityInput rulesForFields/decimalPattern instead of copied lengths
or numeric precision. Keep required inputs, signs, canonical format, collection
limits, eligibility and existing field authorization. Posted sources provide
physical shape without granting their immutable record CRUD operations.

The targeted corrections change input preparation only. Financial posting,
numbering, rounding, allocations and workflows are unchanged. Other physical
validation copies outside the verified command scope remain separate review work;
this is not whole-ERP acceptance or a new extension framework.