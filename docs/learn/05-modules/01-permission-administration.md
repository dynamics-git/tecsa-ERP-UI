# Permission administration

The permission module uses ordinary shared table APIs and the same page/config pattern as Users and PR. Its domain logic resolves company membership, permission-set assignments, resource rights and page/control rules.

## Tables and responsibilities

| Table/source | Purpose | Key relationship |
| --- | --- | --- |
| users / users | Global user records | userName |
| company_users / companyUsers | Company membership | userName + companyCode |
| permission_sets / permissionSets | Reusable sets | code |
| user_permission_sets / userPermissionSets | Assigned sets with company applicability | userName + permissionSetCode + companyCode |
| permission_set_permissions / permissionSetPermissions | Backend resource operations | permissionSetCode + resource |
| page_permissions / pagePermissions | Page, command and field controls | permissionSetCode + page/control identity |

Permission administration records are shared. They do not need a separate copy per company. Assignment company scope and authorized API company context still matter; shared storage does not mean every admin may edit every rule.

## Administrator journey

1. Open Users and select a user.
2. Open the User card. Assigned permission sets appear in its shared line grid.
3. Set company scope on an assignment when it applies to one company; blank scope means all-company applicability under the permission resolver.
4. Use Company Access to manage that user's company membership.
5. Select an assignment and use Open Permission Set to open the same Permission Set card available from the Permission Sets menu.
6. Resource rights appear as lines. Page Permissions opens the related worksheet for page/button/field rules.
7. Page Configuration shows the available page/control catalog; users should select existing identifiers rather than invent them.

The shared modal journey should preserve the originating user's state when returning. Opening a set resolves its business code, not the assignment's record ID.

## Login and company changes

An active user needs permitted company membership. Applicable active set assignments are resolved for the chosen company, including all-company assignments. Login supplies effective permissions to UI core; switching company refreshes/re-resolves them in its existing selection flow.

UI permissions arrive in `auth/login` as `data.session` and are reused by ordinary
pages. The separate `auth/context` endpoint is removed. Company selection/switching
uses the existing `auth/companies?companyId=...` response's `meta.session`.
App startup, window focus, navigation and saving permission rows do not trigger
additional session reads. Permission edits are reflected in the UI after Company
reselection or login; backend CRUD checks remain authoritative on every request. Session
discovery does not load the fields or relationships of every published table.
Object IDs identify developer metadata; Users and ordinary CRUD do not require one.

Permission grants across applicable sets are combined by the existing resolver. Do not invent a new explicit-deny precedence scheme in a page config. System-owned set restrictions are domain rules independent of whether the current account is called admin.

## Backend resource rights

Read, Create, Modify, Delete and Execute govern published resource operations. Backend authorization remains mandatory for requests made outside Angular. Domain actions must be authorized as actions, not treated as harmless button labels.

## Page and control rules

`pageId` identifies the page. `targetType`, `surface` and `targetKey` distinguish page-level, command and field rules. The catalog exposes identifiers from existing configs. Stable keys are essential; changing a button label must not accidentally change its permission identity.

`apiSource` on a field rule binds it to the corresponding published backend source for field protection. It is not the UI route or a new permission-specific API pattern.

## Page configuration catalog

The UI catalog is derived from registered page/config metadata. It describes pages, controls and supported source bindings. It is a catalog, not a second place to define fields or manually register every page in core. New config metadata should flow through the shared catalog rather than a permission-only hardcoded page list.

## Saving permission rows

### Selected-resource Page Permissions

Select one saved resource line in a Permission Set, then use the line toolbar's
**Page Permissions** action. It carries the set's business code, selected resource
and system-owned status. **All Page Permissions** on the header remains the
unfiltered set-wide editor.

The resource editor discovers matching registered pages from both header and line
data sources, using the source path/resource identity already received at login.
Page, area and button/field choices stay within that resource. When only one page
matches, a new rule starts with that page selected. Choosing a field fills its
published API Source automatically; that column is read-only in both editors.
Stored rules are filtered using their real page/type/area identities, not a
fictional `resource` column on `page_permissions`. Page-open rules apply to the
whole page, so a shared Header–Line page has one page-open rule, not separate
copies for each table resource.

**Page Configuration** opens the same resource-filtered read-only catalog, and
keeps that scope when opening a page's controls. If no registered page consumes a
resource yet, the editor says so and disables new rules; it never substitutes
unrelated pages. A physical table or API source does not by itself create a UI page.

This is local config composition over shared RunModal/CRUD, not a context API or
another permission engine. No additional permission fetch runs on page opening.
After updating the UI/backend, sign out and sign in once to receive source names
in the login snapshot. Existing live backend authorization remains authoritative.

### Keep ordinary page configs readable

Declare header fields once. Reuse the existing `listColumns` helper for a normal
list instead of repeating field labels and editor types:

```ts
dataSurface: {
  columns: listColumns(usersHeaderConfig, ['userName', 'name', 'email', 'isActive', 'lastLoginAt']),
},
```

Use an object entry only when that list needs an actual override, such as width
or a badge. Keep record identity and Header–Line business bindings explicit.
`pageId` is the UI route/command/permission identity; optional numeric `objectId`
links the existing Page Object metadata. Neither replaces `systemId`, nor means
that Laravel generates the Angular page layout. Do not copy backend table fields,
Object Names, source tables or Codeunit declarations into a normal Angular config.

These are ordinary row APIs with core autosave. New, edit and delete follow their source capabilities. There is no special collection PUT Save flow. Existing system-owned or unsupported operations remain protected on the backend and reflected by the UI.

## Review and testing boundary

Validate the permission module first, including company scope and direct API protection. PR can then serve as a business-page integration test. Other modules need their own later verification; do not weaken permission core to bypass incomplete setup in an unrelated module.
