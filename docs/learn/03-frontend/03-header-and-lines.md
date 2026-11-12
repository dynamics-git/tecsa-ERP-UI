# Bind headers, lines and related worksheets

LineConfig describes the child data source, business relation, placement and typed columns. The shared document host renders it for documents, cards and worksheets.

Existing infinite scroll uses bounded reads with count=false and the backend's
hasMore continuation rather than counting all matching records on each read.
The same behavior applies to ordinary lists, modal lists and worksheets.
Document Lines honor hasMore while retaining the existing 1,000-line editor
limit and compatibility with older total/short-batch responses. A full final
batch with hasMore=false completes without another empty read. No numbered
pagination or new loading button is added.

Ordinary saves use the shared Header/Line field CRUD paths. The unused global
DocumentSavePort/DocumentSaveService and DocumentStateService.scheduleHeaderAutosave
wrapper were retired, including their application provider and public exports.
They are not an alternative page save extension point. Existing config-driven
manual/singleton modes still use ListPage's shared persistence; no new save engine
or separate draft endpoint is introduced. New records POST normally, then changes
PATCH the returned identity/version. Generic create errors refer to a record,
not a draft workflow. Business document statuses remain their own backend rules.

For ordinary header/line documents, an attempted line interaction or add/copy/paste
before Header creation shows a visible error explaining that the Header must be
created first. Editors retain their configured editability, rather than silently
turning gray. Entered line values remain local until the parent is confirmed.
Typing a header business key is not confirmation that its POST succeeded. The
write guard blocks child POST/PATCH during pending or failed Header creation.
It uses the Header CRUD identity plus configured headerPKProp/lineFKProp and every
parentFieldMap value, independently of field required validation. Worksheets keep
their separate existing row-only behavior. Autosave is the default; no per-page
autoSave:true declaration is needed for this parent-before-child guarantee.

Refresh on an unsaved Header resets it to configured defaults after any discard
confirmation; it does not attempt to reload nonexistent children and silently
return. Accepted discard clears the previous field-validation/unsent-edit state
and pending autosave timer. Cancelling retains the input. A saved Header still
reloads Header and Lines from the server. Corrected Header input/create progress
replaces the obsolete missing-parent message through the existing status path.

## Placement

```typescript
placement: {mode: 'after-section', afterSectionId: 'general'},
```

The named section must exist in HeaderConfig. Use `mode: 'end'` when the line area belongs after all header sections. Do not add spacer fields or page CSS to position a line grid.

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

The initial Card waits for its Header and business Lines, then the existing form
and grid finish selected captions independently. Optional lookup names do not
delay readiness. Header/Lines failures still keep the load error and Retry state;
this is not permission to hide failed record reads or replace them with empty rows.

## Totals and calculated fields

Use the declared calculation and totals contracts for presentation calculations. Database/posting amounts remain server-authoritative. The [calculation guide](/documentation/core/calculations-and-defaults) explains the difference.
