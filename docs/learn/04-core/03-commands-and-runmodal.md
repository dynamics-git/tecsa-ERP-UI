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

## Shell drawers

### Company selection

The header Company button opens the dedicated `CompanySwitcher` through the existing `DrawerService`, above the current document. It does not use a generic confirmation prompt or require page configuration. This shell component owns company-selection presentation; ordinary ERP pages continue to use their existing configs.

The drawer loads authorized companies through the existing `AuthService.authorizedCompanies()`, searches the returned names/codes locally, marks the current company and separates row selection from the **Switch company** action. Only the company list scrolls; search and footer remain available. Loading, empty/search-empty, load retry and switch errors appear within the drawer. Search receives focus on opening, native radio controls support keyboard selection, and Cancel, Escape or the backdrop dismiss without switching.

Both opening the drawer and confirming a switch use the existing pending-edit guard. Confirmation rechecks because edits may have changed after opening. Switching calls the existing `AuthService.switchCompany()`; authorization and session updates remain there. Duplicate submissions and drawer dismissal are blocked while switching. Failure retains the selection for retry; success reloads the existing workspace base URL so old-company records and caches do not remain active. No new backend endpoint, permission rule or company-management feature is introduced.

Implementation: `src/app/features/auth/company-switcher/`, integrated by the existing header and drawer host. Company creation/administration remains separate future work.

Company selection, Profile and Notifications load their existing standalone components when their drawers open. The host shows the shared loading indicator while loading and an error if a component cannot load. This keeps optional drawer code out of startup without raising the production bundle budget.

The shell profile dropdown remains accessible above RunModal documents, at the existing global-search panel layer. Clicking or tapping back into a document dismisses it before the document action runs; interactions inside the profile menu remain available. Escape closes the shell menus. Do not raise the entire header or document stack to fix one dropdown.

## Keep registration automatic

The page module exports its config and uses the established feature folder. Shared discovery/registry resolves page IDs. Do not maintain a thousand-entry manual RunModal page list. Navigation identity resolution belongs in core, not copied into each page's TS.
