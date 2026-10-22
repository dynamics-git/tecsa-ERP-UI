# UI foundation conventions

Use the existing shared ListPage runtime. Do not create a feature-owned CRUD
engine, a backend page registry, or another form renderer.

## One feature-page pattern

All 41 registered pages have the same file responsibilities, including related
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

Register each routed master module once in features/run-modal-page-modules.ts.
The module exports its feature component and re-exports its page configurations. One registered module declares one page.
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
