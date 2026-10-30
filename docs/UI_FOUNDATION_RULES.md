# UI foundation conventions

Use the existing shared ListPage runtime. Do not create a feature-owned CRUD
engine, a backend page registry, or another form renderer.

## Shared names

Use RestService for API calls and RunModal for opening a page in a modal.
page-registry.ts resolves discovered pages by pageId for both routes and RunModal;
new pages do not need manual registry entries. PageModule describes the discovered
exports, and PageCommandEvent carries page commands.

Page declarations use ListPageConfig, HeaderConfig, LineConfig and FactBoxConfig.
The Angular application wires the existing REST adapter with dataRestProvider;
feature pages do not configure providers or implement ordinary CRUD.

Code identifiers do not use an ERP prefix. Product names, deployment environment
variables, existing storage namespaces and historical migration references keep
their existing spelling.

## One feature-page pattern

All feature pages have the same file responsibilities, including related
worksheets opened only inside a popup:

- Page config: the complete declaration, including pageType, data source, list
  columns, card/line fields, FactBox, lookups, menu and actions.
- Page TS: the thin Angular component, configuration bindings and genuine
  page-specific business handlers. No ordinary REST/CRUD implementation.
- Page HTML: pass those declarations to the existing shared ListPage renderer.

Routing and RunModal instantiate that same feature component. Related worksheet
components are actively used by the popup host; they are not empty scaffolding.
The optional runModal input carries the selected parent record and the existing
window close callback. Page-specific business events reach the component in both
navigation paths. No separate persistence or form engine is introduced.

The registry rejects config-only pages and multiple component definitions.
List labels/types reuse explicit card fields through listColumns. Read-only
list-only fields remain explicit exceptions. Shared list behavior consumes the
server's query capabilities; do not repeat per-field sort/filter/search flags.
Writable fields derive from editable card/line fields. readonlyAfterCreate
excludes a field from updates. Backend permissions and validation remain
authoritative.

## Page types and related navigation

pageType describes the entry surface:

| Type | Behavior |
| --- | --- |
| card | Browse the list, then open the configured field-based card. |
| document | Browse the list, then open a header with owned lines. |
| worksheet | Open an editable grid directly within its required parent context. |
| setup | Open the company singleton form directly. |
| list | Browse records without assuming an editable card. |

Use existing DocumentWindow, DynamicForm, DocumentLines and RunModal components
through ListPage. DocumentPage remains a compatibility export of that same class
for existing consumers; it is not another runtime or a feature-page convention.

Eight related worksheet configurations declare each parent-scoped data source
once and share it between their list/line declarations. Each has its own component, config and HTML, and the popup host
actively instantiates that component. Item UOMs, default dimensions, exchange rates and
other related collections open from configured Related commands. Do not embed
every relationship as lines in a master card. No. Series deliberately owns its
numbering-range lines and remains a document.

## Registration, permissions and presentation

The page-discovery script finds feature folders and generates the ignored page
imports. Do not maintain a manual import list. The module exports its feature
component and re-exports its page configurations. One discovered module declares one page.
Menu placement belongs to the page definition and its owning business module.

The backend discovers effective permissions from its server entity catalogue.
AuthService binds the returned API paths to the endpoints/navigation already
declared in the UI registry. No ui_pages.php list or duplicated operation map is
required. Parent and child operation permissions remain separate. Super Admin
has all permissions but cannot bypass an unsupported operation or a business
invariant. Buttons and editable fields use the same shared operation policy.

Use existing SVG icons, typography, tokens, flat workspace surfaces, loading,
autosave, concurrency, confirmation and lookup behavior. Do not redesign visual
layout as part of a configuration cleanup. Configure useful FactBox information
or disable it rather than duplicating every form field.

Use the foundation public API from feature code. Run local UI tests, a build,
import-boundary checks and token checks for changes to this shared foundation.

## Developer field changes

Use `ListPage.validate(field, value)` and `ListPage.validateLine(row, field, value)`
for programmatic edits. These call the existing editors, so type conversion,
validation, dependent fields, dirty tracking and the configured save policy are
the same as typing. Awaiting the result confirms field validation; it does not
promise that an asynchronous autosave has completed. Manual-save pages still
wait for Save. Direct object assignment is not the record editing API.

Reuse `validation.custom`, `customAsync` and `afterValidate`. Their context
contains field, proposed value, previous value, proposed record, previous record
and source (`user` or `code`). Callbacks are pure: return other same-record
values from `afterValidate`; do not start saves from validation callbacks.

Required header-to-line business updates run through backend model field rules
inside the operation transaction. They cover all matching database rows, not
only loaded UI rows. A successful response may include `meta.changedResources`;
core invalidates those reads and refreshes clean loaded lines after the header
save. Unsaved values are retained. `parentFieldMap` remains relationship binding,
not an update-all-lines instruction. No `copyToLines` property is supported.
