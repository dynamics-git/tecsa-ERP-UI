# Commands and RunModal navigation

Standard commands come from shared core. Declare custom business actions or navigation through CommandConfig, with stable keys and existing icons.

## Open the selected assignment's permission set

```typescript
{
  label: 'Open Permission Set',
  actionKey: 'cmd:open-permission-set',
  surface: 'line',
  icon: 'ts-icon ts-icon-arrow',
  isPrimary: true,
  order: 25,
  requireSelection: true,
  runModalPageId: 'permission-sets',
  runModalTarget: 'entry',
  runModalRecord: {
    source: 'activeLine',
    fields: {code: 'permissionSetCode'},
  },
}
```

`surface: 'line'` identifies the command area. It is not a relationship field. `source: 'activeLine'` reads the chosen row. In `fields`, the target page field is on the left; the chosen source record's field is on the right.

The target set is found by `code`. Core requires exactly one match before opening its card. No match or multiple matches must show an error; it must not open an arbitrary set or create a new record.

## Open a user's related worksheet

```typescript
{
  label: 'Company Access',
  actionKey: 'cmd:company-access',
  surface: 'header',
  icon: 'ts-icon ts-icon-building',
  runModalPageId: 'user-company-access',
  runModalTarget: 'entry',
  runModalRecord: {
    source: 'header',
    fields: {userName: 'userName', name: 'name'},
  },
}
```

This passes user context. The target worksheet binds its `userName` child FK to that value. Passing display context such as name does not turn it into a database key. For a composite relation, map all fields required by the target contract.

## Open a list

`runModalTarget: 'list'` opens the target browse surface rather than a selected record entry. Use this for a general catalog such as Page Configuration. Do not attach a selected-row identity merely because the invoking command happens to be in a row area.

## A server business action

```typescript
{
  label: 'Submit',
  actionKey: 'cmd:submit',
  group: 'Process',
  apiAction: {name: 'submit', states: {field: 'status', values: ['open']}},
}
```

This is the PR Submit pattern. The backend must expose and authorize that domain action and enforce the state transition. `states` is useful UI availability, not the authoritative workflow check.

## Selection and layout

`requireSelection`, `selectionMode`, `order`, `group`, `isPrimary`, `hidden`, `disabled` and `tooltip` describe command behavior. `permissionKey` is an explicit override where the standard command identity cannot be used; do not invent a separate permission alias for every button.

## Keep registration automatic

The page module exports its config and uses the established feature folder. Shared discovery/registry resolves page IDs. Do not maintain a thousand-entry manual RunModal page list. Navigation identity resolution belongs in core, not copied into each page's TS.
