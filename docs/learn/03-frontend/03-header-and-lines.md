# Bind headers, lines and related worksheets

LineConfig describes the child data source, business relation, placement and typed columns. The shared document host renders it for documents, cards and worksheets.

## Placement

```typescript
placement: {mode: 'after-section', afterSectionId: 'general'},
```

The named section must exist in HeaderConfig. Use `mode: 'end'` when the line area belongs after all header sections. Do not add spacer fields or page CSS to position a line grid.

## Initial line area and resizing

Cards and documents open with space for six rows even when empty or holding one
record. Longer data grows the initial area to eight rows; automatic height is
capped at 40% of viewport height to leave room for the header and totals. The
shared `LINE_GRID_LAYOUT` policy owns these defaults and manual resize bounds.
Resizing remains local to the open window; Home or double-clicking the handle
restores the responsive default. It is not saved across popup instances.

Existing header-to-lines spacing, calculations/totals and following sections
retain their layout. Worksheets retain their available-height grid; lists and
pages without Lines keep their existing layout. No per-page configuration is required.

## Users example

```typescript
export const usersLineConfig: LineConfig = {
  placement: {mode: 'after-section', afterSectionId: 'general'},
  dataSource: {
    endpoint: '/userPermissionSets',
    keyField: 'systemId',
    headerPKProp: 'userName',
    lineFKProp: 'userName',
  },
  editable: true,
  columns: [
    {
      id: 'permissionSetCode', label: 'Permission Set Code', type: 'lookup',
      required: true,
      lookup: {endpoint: '/permissionSets', valueField: 'code', displayField: 'code', recordRead: 'collection'},
    },
    {id: 'isActive', label: 'Active', type: 'boolean', defaultValue: true},
  ],
};
```

The real Users config has additional name/company columns and a command. This reduced example explains the binding; the [worked source](/documentation/examples/users) includes the full current file.

## Column identity and field binding

`id` identifies the visible column. Optional `field` points to its underlying record field if the two differ. A second read-only lookup column can display a permission-set name using the same stored `permissionSetCode`; that does not mean the name is a second FK or writable duplicate.

## Copy header fields when creating a line

```typescript
parentFieldMap: {
  documentType: 'documentType',
}
```

This maps child `documentType` from header `documentType`. The same mechanism can bind another real header/child field. It is not a promise to cascade every later header edit into all existing saved lines. Such a business invariant belongs in backend transactional rules.

## Typed columns

```typescript
columns: [
  {id: 'description', label: 'Description', type: 'text'},
  {id: 'status', label: 'Status', type: 'select', options: [
    {label: 'Open', value: 'open'}, {label: 'Closed', value: 'closed'},
  ]},
  {id: 'isActive', label: 'Active', type: 'boolean'},
]
```

Editable entry rows show the supported typed controls even before a saved value exists. Visual placeholder rows are not API records. Read-only worksheet presentation is a separate state, not proof that an admin cannot see data.

## Loading and refresh

Keep grid structure stable while data loads. Loading indicates an outstanding read; a ready empty response is an empty collection. Server-changed lines should refresh without overwriting unsaved local drafts. A missing route or timeout must be shown as an error rather than silently presenting “0 lines” as a successful read.

## Totals and calculated fields

Use the declared calculation and totals contracts for presentation calculations. Database/posting amounts remain server-authoritative. The [calculation guide](/documentation/core/calculations-and-defaults) explains the difference.
