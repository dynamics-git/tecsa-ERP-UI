# Extend business behavior without duplicating CRUD

Use the shared lifecycle for business rules. Add source options or model behavior only when the table's domain needs them; ordinary tables keep the three-file pattern.

## Source options

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

Passwords require write-only/create-only handling in the source contract and hashing in the appropriate user business logic. Hiding a password in a form or FactBox does not stop an API response leaking it. Server field policies must prevent that exposure.

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

The shared `EntityBehavior` contract offers `scope`, `beforeWrite`, `determine`, `validate` and `afterWrite` stages. A behavior can apply a domain rule without replacing generic controller CRUD. Use the actual interface signatures from the backend when implementing one; lifecycle callbacks are not interchangeable with UI save callbacks.

## Posted and system-owned records

Disable unsupported operations on the API and reflect their capabilities in the page. A posted ledger can be a worksheet visually while its source is read-only. System-owned permission sets remain immutable where the domain policy requires it, even for a user who can read their rights.

## Future SDK packages

The backend also contains an integration provider example for package-based table publication. That is an advanced integration surface, not another registration required for ordinary controllers. The future SDK generator must emit the same supported contracts rather than creating a parallel CRUD architecture.
