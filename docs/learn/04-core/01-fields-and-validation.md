# Fields, validation and autosave

Field config chooses the editor and validation policy. Shared core performs the entry lifecycle and ordinary field-by-field autosave. Page TS should use the public validation method when changing a field programmatically.

## Field types

Text, number, dates/times, email, URL, phone and boolean value types are shared across surfaces. FieldConfig also supports specialized editors such as password, currency, select, dropdown, lookup, textarea and badge. The generated reference shows the exact current union and column contracts; do not delete valid field types as a “duplicate cleanup.”

```typescript
{key: 'email', label: 'Email', type: 'email', required: true, validation: {maxLength: 255}}
```

`type` selects behavior; `label` is the visible caption; `key` is the API field. Line columns use `id` and an optional `field` override.

## Editability

`readonly` always prevents editing. `readonlyAfterCreate` permits initial entry and prevents later changes. `disabled` disables an editor, and `hidden` removes its visible presentation. Conditions can refer to other record values through `requiredWhen`, `readonlyWhen` and `hiddenWhen`.

Do not inspect `systemId` in individual field conditions just to determine create/edit state when the existing lifecycle property expresses the requirement. Record identity belongs in the data source.

## Built-in and custom validation

```typescript
{
  key: 'quantity', label: 'Quantity', type: 'number',
  validation: {min: 0, precision: 18, scale: 5},
}
```

```typescript
{
  key: 'name', label: 'Name', type: 'text',
  validation: {
    custom: ({value}) => String(value ?? '').trim() ? undefined : 'Enter a name.',
    afterValidate: ({value}) => ({searchName: String(value).toUpperCase()}),
  },
}
```

`afterValidate` returns patches for other declared editable fields. The example assumes `searchName` exists in the API and form. It is not permission to write arbitrary or protected fields. `customAsync` can perform an asynchronous check; core rejects stale validation responses rather than applying an old answer to new input.

## Programmatic changes in TS

```typescript
// page is the existing ListPage instance obtained through ViewChild.
const result = await page.validate('purpose', 'Revised purpose');
if (!result.valid) {
  // Show or handle the returned validation errors for this custom action.
}
```

This goes through the same supported validation/save policy. Directly assigning to an internal form object can skip validation, dirty tracking and persistence. Do not import private editor classes to implement a page action.

## Autosave is the ordinary default

Omit `autoSave: true`. Core uses the shared save policy when there is no manual Save/Apply flow. Valid field changes are saved through ordinary CRUD with scope, concurrency and error handling.

Manual-save pages are an explicit supported exception. They keep changes until Save/Apply and should have a business reason. Do not add a Save button merely because permission rows are new to the module.

## Write callbacks

`dataSource.hooks` supplies `beforeCreate`, `beforeUpdate`, `beforeDelete`, success callbacks and `onError`. A before callback can return a message to veto a write. Success callbacks observe confirmed API success. These callbacks do not create server transactions and cannot guarantee atomic header/line changes.

## Server validation still applies

UI checks are entry assistance. Database constraints, backend field policies and lifecycle rules enforce all-client integrity. For header-to-saved-line propagation, use the backend transactional lifecycle described in [business rules](/documentation/backend/business-rules-and-exceptions).
