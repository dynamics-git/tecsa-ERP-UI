# Commands and RunModal navigation

Standard commands come from shared core. Declare custom business actions or navigation through CommandConfig, with stable keys and existing icons.

## Shared ERP presentation hierarchy

Typography and density are owned by shared tokens, not individual page configs.
The 6 November 2026 visual pass keeps TecSA navy for brand, links, selection and
focus while using neutral foregrounds for readable ERP text:

| Role | Shared presentation |
| --- | --- |
| Ordinary data | 13px / 400, primary dark text |
| Labels and column captions | 13px / 400, dark neutral label color |
| Commands and list tools | 13px / 400, dark neutral command color |
| General / Lines / FactBox sections | 16px / 600, primary dark text |
| Record title | 24px / 400, primary dark text |
| Secondary metadata | 12px, muted text |

Disabled commands retain their shared disabled state. Required labels stay
readable; readonly fields keep their existing semantics. Native checkboxes share
an 18px size and boolean grid cells/captions are centered. Header/form checkboxes
use navy and align within the adjacent input-height slot.

Shared controls are 30px high with a one-pixel border and 3px radius. Document
command and section bars are 36px and 34px; list rows use 36px normal, 32px compact
or 44px spacious density. Line editing keeps its existing 32px row height.
Header, Lines, totals and subsequent sections keep their existing order and
spacing; no separating gap is added before Lines. Short/narrow lists keep the
search control at field height when their toolbar stacks.

## Shared presentation tokens

Menu height, padding, icon/chevron size, command height/gap/weight and shared
form padding/radius/checkbox size live in
`assets/styles/tokens/_components.scss`. Font roles live in `_typography.scss`;
foreground and state colors live in `_colors.scss`. Parent-menu leading icons
remain 18px with 13px dropdown chevrons and bold menu labels. Use these shared
roles instead of page-specific visual overrides. Dashboard styles reference the
same defined semantic tokens rather than unresolved custom-property names.

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

Shared shell/document/line toolbars visibly dim disabled commands, show a
not-allowed cursor and suppress active hover styling. The native disabled state
still blocks execution; a reason is supplied by the existing command tooltip.
Do not style or force-enable commands separately in a feature page.

Authenticated route entry initializes the existing AuthService refresh lifecycle,
including restored sessions after a browser reload. It refreshes the current
server access context without waiting for a company/profile drawer to open.
Further page navigation reuses the same service instance; it does not add a context
request per page. An already-open worksheet reapplies current server grants when
the session permissions update. SUPER does not override an API operation explicitly
reported as unavailable; API authorization remains authoritative.

## Shell drawers

### Company selection

The header Company button opens the dedicated `CompanySwitcher` through the existing `DrawerService`, above the current document. It does not use a generic confirmation prompt or require page configuration. This shell component owns company-selection presentation; ordinary ERP pages continue to use their existing configs.

The drawer loads authorized companies through the existing `AuthService.authorizedCompanies()`, searches the returned names/codes locally, marks the current company and separates row selection from the **Switch company** action. Only the company list scrolls; search and footer remain available. Loading, empty/search-empty, load retry and switch errors appear within the drawer. Search receives focus on opening, native radio controls support keyboard selection, and Cancel, Escape or the backdrop dismiss without switching.

Both opening the drawer and confirming a switch use the existing pending-edit guard. Confirmation rechecks because edits may have changed after opening. Switching calls the existing `AuthService.switchCompany()`; authorization and session updates remain there. Duplicate submissions and drawer dismissal are blocked while switching. Failure retains the selection for retry; success reloads the existing workspace base URL so old-company records and caches do not remain active. No new backend endpoint, permission rule or company-management feature is introduced.

Implementation: `src/app/features/auth/company-switcher/`, integrated by the existing header and drawer host. Company creation/administration remains separate future work.

Company selection, Profile and Notifications load their existing standalone components when their drawers open. The host shows the shared loading indicator while loading and an error if a component cannot load. This keeps optional drawer code out of startup without raising the production bundle budget.

The shell profile dropdown remains accessible above RunModal documents, at the existing global-search panel layer. Clicking or tapping back into a document dismisses it before the document action runs; interactions inside the profile menu remain available. Escape closes the shell menus. Do not raise the entire header or document stack to fix one dropdown.

## Shared command dialogs

Use `ConfirmationService.prompt(title, fields, options?)` for command parameters.
Optional `message` and `confirmLabel` describe the operation; existing callers
retain their defaults. Shared prompt fields use DynamicForm's stacked layout;
ordinary document forms retain their current layout. Keep descriptions short and
use readable choice labels instead of large explanatory panels.

After submission, use the existing dialog host and LoadingIndicator through
`ConfirmationService.progress(title, message)`. It returns a completion function:

```ts
const finish = confirmation.progress('Copying company…', 'Creating the new company.');
try {
  await executeCopy(); // Page business operation, using the existing API transport.
} finally {
  finish();
}
```

Progress has no confirm/cancel actions and ignores Escape/backdrop dismissal.
Start it only when the request begins, never while the parameter form is open.
Retain the page's pending-operation/navigation guard; UI blocking cannot guarantee
that a request completes if the browser process or server is stopped. Do not
use this path to replace Core's existing CRUD/delete workflow.

## Request lifetime and sensitive writes

Core's default `RUNTIME_TIMEOUT_POLICY` is empty: ordinary lists, worksheets,
lookups, filters, notifications and RunModal hydration wait for the actual server
response. Shared `optionalRequestTimeout` applies a limit only when explicitly
provided by the host. Page developers do not repeat timing configuration.

Company Copy and normal writes have no artificial client deadline or automatic
retry. Background save state remains `saving` while pending; elapsed time alone
does not prove failure or an unknown outcome. Actual network failures can still
leave a write outcome uncertain, so preserve edits and verify server state before
retrying. Existing Company/user scope, stale-response checks, row versions and
navigation/pending-edit guards remain active. Cache freshness, autosave debounce,
session security and successful-notice dismissal are separate from request limits.

## Keep registration automatic

The page module exports its config and uses the established feature folder. Shared discovery/registry resolves page IDs. Do not maintain a thousand-entry manual RunModal page list. Navigation identity resolution belongs in core, not copied into each page's TS.
