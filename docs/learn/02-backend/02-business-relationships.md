# Design business keys and relationships

Choose business relationships in the database first. UI filters express those relationships; they do not create database integrity. Record identity and relationship fields serve different purposes.

## Users and assigned permission sets

| Table | Business fields | Relationship |
| --- | --- | --- |
| users | user_name | Unique user business identity |
| permission_sets | code | Unique permission-set business identity |
| user_permission_sets | user_name, permission_set_code, company_code | User assignment with optional company applicability |
| company_users | user_name, company_code | User membership in a company |
| permission_set_permissions | permission_set_code, resource | Resource rights belonging to a set |
| page_permissions | permission_set_code, page_id, target_type, surface, target_key | Page/control rights belonging to a set |

These are shared permission tables. Their company applicability is a business field, not automatic per-company storage ownership. A blank company code on a set assignment means all-company applicability under the resolver's rules; the user still needs active membership to enter a company.

```php
// Schematic FK declarations inside the child-table migration.
$table->foreign('user_name')->references('user_name')->on('users');
$table->foreign('permission_set_code')->references('code')->on('permission_sets');
```

The referenced columns must be unique with compatible types. Define null/blank semantics and duplicate prevention deliberately, including PostgreSQL's treatment of nullable unique columns. Do not assume a nullable unique index prevents every duplicate all-company assignment.

## UI binding

```typescript
dataSource: {
  endpoint: '/userPermissionSets',
  keyField: 'systemId',
  headerPKProp: 'userName',
  lineFKProp: 'userName',
}
```

This means “load assignment rows whose `userName` equals the current header's `userName`.” The assignment's `systemId` identifies that individual assignment for PATCH/DELETE. It is not copied into `userName`.

## Composite document matching

A document line can require company, document type and document number to identify its owner. Company is supplied by the authorized API context; declare the additional business fields explicitly.

```typescript
dataSource: {
  endpoint: '/purchaseRequisitionLines',
  keyField: 'systemId',
  headerPKProp: 'number',
  lineFKProp: 'documentNumber',
  parentFieldMap: {
    documentType: 'documentType',
  },
  defaultSort: 'lineNo asc',
  invalidates: ['/purchaseRequisitions'],
}
```

The left side of `parentFieldMap` is the child API field; the right side is the header field. Line number orders or distinguishes business lines where defined. It does not replace the record's CRUD identity or the document relationship.

## Opening another record

An assignment's permission-set code maps to the target set's `code`. The shared RunModal resolver searches that business key, requires one matching record, then uses the returned record identity internally. Never pass the assignment's own ID as the permission-set ID.

See [commands and RunModal](/documentation/core/commands-and-runmodal) for the exact mapping.

## GUID usage

System record IDs remain valid for API addressing, audit references and company context. They are not mandatory business relationship fields. Use the relationship designed for the domain and enforce it with the correct FK; do not mechanically replace every relationship with a GUID or every GUID with a code.
