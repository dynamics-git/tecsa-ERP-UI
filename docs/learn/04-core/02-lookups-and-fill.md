# Lookups, selected values and fill

A lookup selects a value from another source. Keep its stored business value, displayed caption and the selected record's CRUD identity distinct.

## Store a code and display a name

```typescript
{
  key: 'permissionSetCode',
  label: 'Permission Set',
  type: 'lookup',
  lookup: {
    endpoint: '/permissionSets',
    valueField: 'code',
    displayField: 'name',
    searchFields: ['code', 'name'],
    recordRead: 'collection',
  },
}
```

`valueField: 'code'` means the form stores the selected set's code. `displayField: 'name'` controls its caption. `keyField: 'systemId'` elsewhere identifies records for CRUD; it does not mean all lookups must store a system ID.

`recordRead: 'collection'` resolves a stored business value by filtering the collection when a record URL expects the system ID. Do not send `SUPER` to a `{systemId}` record endpoint and expect it to be a GUID.

## Fill another field

```typescript
fill: {
  description: 'description',
}
```

The left side is the destination field on the current record. The right side is the property on the selected lookup result. Only declare real fields supported by the relevant form/API contract.

In Page Permissions, `fill: {apiSource: 'apiSource'}` copies the selected catalog entry's API source name into the permission rule's `apiSource` field. That name binds field protection to a published backend source. It is not a new name for the page, a backend fillable array or a second table registration.

## Dependent lookup

```typescript
lookup: {
  endpoint: '/exampleVariants',
  valueField: 'code',
  displayField: 'description',
  recordRead: 'collection',
  dependsOn: [{
    source: 'record',
    in: 'filter',
    field: 'itemNumber',
    valueFrom: 'itemNumber',
  }],
}
```

This endpoint is illustrative. `field` names the lookup source's filter field; `valueFrom` names the current record field supplying the value. Line lookups can use `source: 'header'` for parent context. Dependencies must be present before searching. Fixed `filter` is combined with dependency and search clauses.

Use `in: 'path'` only for an API contract that explicitly expects a dependency in the REST path. Flat ordinary sources do not need nested paths simply because their UI is a child grid.

## Options and clearing

For a small fixed enum, use `type: 'select'` with `options: [{label, value}]`. `optionsDataKey` identifies supplied option data in the supported runtime. Line columns can declare `clearFieldsOnChange` to clear dependent values when a driving field changes.

## Compatibility aliases

Older configurations may contain top-level `valueField`, `labelField`, `api` or options endpoint aliases. New lookup configs use the nested `lookup` object consistently. Do not keep both forms in the same new field to “make it work.”
