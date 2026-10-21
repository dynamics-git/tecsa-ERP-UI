# TecSA ERP UI — foundation architecture (F1)

This repository is the Angular 21 frontend for the Laravel TecSA ERP 26.0 backend. This document is the authoritative UI structure and naming specification. Do not create a second competing UI or restore the retired Filaze installer.

## Naming

- **Folders, file names and selectors:** lowercase kebab-case (`document-window/`, `document-window.ts`, `app-document-window`).
- **TypeScript classes and types:** PascalCase (`DocumentWindow`, `DocumentWindowConfig`). Angular 21 component classes do not need `Component` suffix.
- **Services:** PascalCase + `Service` (`RunModalService`); method/property names camelCase.
- **No decorative product prefixes** on ordinary code symbols: not `ErpDocumentWindow` or `TecsaListPage`.
- **RunModal is a platform capability:** preserve this term. Avoid generic `entry-dialog` for a whole document window.

## Target structure (create ONLY directories containing actively used code)

```text
src/app/
  core/                        # authentication, authorization, company context, API client
  layout/                      # header, main-layout, page-actions, module-menu-panel
  platform/
    pages/                     # document-page, list-page, list-fact-box, list-filter-panel
    document/                  # document-window, document-lines
    run-modal/                 # run-modal-host, stack, launch/config and retained state
    data/                      # current data/hydration/record handling
    models/                    # page and document configuration contracts
  shared/
    ui/                        # dynamic-form, fact-box, command-bar,
                               # drawer-host, confirmation-dialog
  features/
    dashboard/                 # current dashboard
    purchasing/purchase-order/ # reference document page
    auth/                      # current login page
```

This is the intended final location. Move existing working files rather than inventing new duplicate implementations. The live framework is in `platform/` and `shared/ui/`; the retired `src/app/shared/erp-core/` is not an active import path. The migration history records the former locations. No empty future module folders.

## Names for the shared UI and platform

| Current Angular class | Final class | Final home |
| --- | --- | --- |
| `DocumentRuntimeComponent` | `DocumentPage` | `platform/pages/document-page/` |
| `ListPageComponent` | `ListPage` | `platform/pages/list-page/` |
| `ListFactPanelComponent` | `ListFactBox` | `platform/pages/list-fact-box/` |
| `ListFilterPanelComponent` | `ListFilterPanel` | `platform/pages/list-filter-panel/` |
| `EntryDialogComponent` | `DocumentWindow` | `platform/document/document-window/` |
| `LineRendererComponent` | `DocumentLines` | `platform/document/document-lines/` |
| `PopupHostComponent` | `RunModalHost` | `platform/run-modal/run-modal-host/` |
| `PopupStackService` | `RunModalStackService` | `platform/run-modal/run-modal-stack.service.ts` |
| `RunModalService` | `RunModalService` | `platform/run-modal/run-modal.service.ts` |
| `FormRendererComponent` | `DynamicForm` | `shared/ui/dynamic-form/` |
| `FactPanelRendererComponent` | `FactBox` | `shared/ui/fact-box/` |
| `CommandBarComponent` | `CommandBar` | `shared/ui/command-bar/` |
| `DrawerHostComponent` | `DrawerHost` | `shared/ui/drawer-host/` |
| `ConfirmationModalComponent` | `ConfirmationDialog` | `shared/ui/confirmation-dialog/` |
| `Actions` (layout) | `PageActions` | `layout/page-actions/` |
| `Header`, `MainLayout`, `ModuleMenuPanel` | Keep classes | Keep current layout folders |

Rename corresponding filename, Angular selector and relevant model names where unambiguous (`EntryDialogConfig` → `DocumentWindowConfig`, `DocumentRuntimeCommandEvent` → `DocumentPageCommandEvent`). Keep business payload field names, permission keys and saved data structures unchanged. Do not mechanically rename every `Entry*` business interface. Keep the existing public API boundary: export platform/shared types through appropriate stable barrels, and update import-boundary checks to the final structure.

## Scope: keep only what is needed now

Retain auth/login, current dashboard, reusable UI/RunModal engine, shared design tokens, approved shell and the current Purchase Order visual reference. The future purchasing/finance/sales/warehouse features are **not** to be scaffolded in this phase.

Remove obsolete Filaze installation artifacts, copied ZIPs, search-output files, unregistered dummy pages and outdated developer guides; this cleanup has begun in the draft PR.

For legacy customer and administration pages that are currently routed/registered, **remove them only with their related routes, menu/search entries, exports and tests in one verified change** if they are not required for the F1 reference experience. Do not leave phantom menu actions or dead links. Keep authorization enforcement even when the administration screens are not in scope. Do not expose privilege-delegation screens before the owner approves SUPER governance.

Do not remove a necessary runtime dependency merely because its name is old or its file is large. Reuse proven functionality; refactor large services in a later behavior-focused phase.

## Behavior-preserving migration gates

1. Start from the draft PR branch, make changes as reviewable commits; never merge directly to `main`, which triggers FTP deployment.
2. Record build/test baseline. Apply filesystem + symbol + selector + relative import + style/template + route/provider/export changes atomically per group.
3. Run `npm ci`, `npm run lint`, `npm run build`, `npm test -- --watch=false`.
4. Keep multi-level RunModal (no arbitrary depth reduction), global search from anywhere, stacked child windows, preserved parent document data, close-to-parent context, drawers, maximize/restore and existing form actions. No route-only redesign.
5. Do not change API behavior, authorization policy, posting, styling/tokens, visible screen layout or document calculations in a naming-only commit.
6. Review the final tree: no stale Filaze installer, duplicate old/new components, unused demo folders, obsolete imports or empty future modules.
7. CI passing is necessary but not sufficient: manually check nested document opening, header/line loading, returning to parent, and unsaved state in the browser before approval.

This is a migration specification, not proof that naming or UI validation has been completed.

## Configuration-driven integration after F1

Each business page keeps its own `page.ts`, `page.html` and `page.config.ts`.
The template composes DocumentPage; the configuration declares header sections,
line columns, lookups, capabilities, lifecycle states and explicit commands. Page
TypeScript is reserved for business orchestration that cannot be declared.

DocumentPage is the editor for both routed documents and RunModal entries.
RunModalService manages opening windows and bounded list navigation, rather than
maintaining a second persistence implementation. Preserve nested window state.

DataSourceService owns REST record paths, data/meta normalization, exact row-version
headers, sequential writes to a record, scoped caches, nested relations, singleton
GET/PUT and offset/cursor parameters. A 412 never triggers an automatic retry with a
new version. A missing singleton may be created only after an observed 404.
Configuration can restrict an operation; it never grants backend permission.

No. Series, Purchases & Payables Setup, Sales & Receivables Setup and Purchase
Requisition are the initial connected configurations. No. Series and PR line
numbers come from Laravel. PR amounts use backend decimal strings and calculated
results. Header/line saves are separate requests: a partial failure retains the
successfully assigned IDs and displays the error, allowing a deliberate correction.
The document editor reads bounded pages up to 1,000 lines and refuses an incomplete
larger document. High-volume histories should use cursor list/worksheet surfaces.

Menus are derived from registered page configuration and filtered by the verified
login context. New backend page/resource permission registrations belong in
`config/erp_ui.php`; they do not infer rights from captions. Business routes remain
independently authorized by Laravel. Sign in again after updating registrations.

The PO configuration remains a historical visual reference, outside the connected
module menu. Its legacy resource mapping is not a current backend contract.

Local integration changes require browser and build/regression validation before
release. Source parsing alone does not certify rendering, permissions or persistence.

## Shared configuration naming

Use the object name followed by `Config`: `HeaderConfig`, `HeaderSectionConfig`,
`LineConfig`, `LineColumnConfig`, `CommandBarConfig`, `FooterSectionConfig`,
`AttachmentsConfig`, `ListPageConfig` and `DocumentWindowConfig`.
Related types share their object prefix, for example `LinePlacementMode` and
`LinePlacementConfig`. Document status uses `DocumentStatusTone` and
`DocumentStatusMessage`; header detail actions use `DocumentDetailType`.

All toolbar and FactBox buttons use the single `CommandConfig` contract.
Use `CommandTone` and `CommandRunModalTarget` from the command model rather than
creating surface-specific aliases. Generic shared configurations do not carry
`Entry` or `Popup` prefixes solely because they appear in an editor or window.

Business modules import public contracts from `platform/public-api`.
Page exports use the page name plus the contract purpose, for example
`noSeriesHeaderConfig`, `noSeriesLineConfig` and `noSeriesListConfig`.
Each page retains its `.ts`, `.html` and `.config.ts` files.
Use PascalCase for exported types, lower camel case for configuration objects,
and kebab-case for files. Footer presets live in `document-footer-presets.ts`.

The initial naming migration changed TypeScript symbols and the footer preset
module path. The follow-up below also standardizes the shared UI configuration
properties and document inputs. Backend API payloads and permission keys remain
unchanged.
Local source consumers must update old type imports to the names above; the
superseded Entry/Popup command aliases are intentionally removed.

## Current frontend vocabulary for partners

Use one term for each platform concept. These conventions apply to the public
barrels, feature configurations, shared component bindings and their consumers.

| Concept | Canonical names |
| --- | --- |
| Page editor | `DocumentPage`, `HeaderConfig`, `LineConfig` |
| Document surface | `DocumentWindow`, `DocumentWindowConfig`, `documentWindowConfig` |
| Header detail overlay | `DocumentDetailType`, `activeDocumentDetail`, `openDocumentDetail` |
| Related information | `FactBox`, `ListFactBox`, `FieldFactBoxConfig`, `ListFactBoxConfig`, `factBox`, `factBoxSections` |
| Filters | `ListFilterPanel`, `ListFilterConfig`, `ListFilterFieldConfig` |
| Drawer | `DrawerHost`, `DrawerService`, `DrawerRequest`, `drawer.service.ts` |
| Window navigation | `RunModalService`, `RunModalHost`, `RunModalListState`, `RunModalHostData` |
| Window presentation | `PopupConfig`, `PopupSize`, `PopupMode`, `NestedPopupConfig` |
| Document layout | `DocumentLayoutMode` |
| Editing state | `DocumentStateService`, `DocumentRuntimeConfig`, `DocumentActionHandlers` |
| Saving extension | `DocumentSavePort`, `DocumentSaveRequest`, `DocumentSaveResult`, `DOCUMENT_SAVE_PORT` |

Document editing helpers use the `Document` prefix (configuration data, payload,
record, response normalization, hydration and save). Ledger entries are business
records and can still use Entry in their domain names. Do not rename backend
resource names, JSON fields, permission IDs or business command IDs for style.

DocumentWindow inputs match its configuration keys: `headerData`, `lineRows`,
`headerSections`, `lineColumns`, `headerToolbarButtons`, `factBoxSections`, etc.
They do not have a `popup` prefix because this surface also renders inline.
`DocumentPage.documentOnly` selects the editor without its surrounding list.
RunModal host data uses `documentWindowConfig`, `nestedDocumentWindowConfigs`
and `nestedPopupConfigs`. Nested and routed consumers must use the same names.

Rename migration: `FactPanel` -> `FactBox`, `factPanel` -> `factBox`,
`CoreDrawerService` -> `DrawerService`, `FilterField` -> `ListFilterFieldConfig`,
`entryDialogConfig` -> `documentWindowConfig`, and editor `Entry*Service` ->
`Document*Service`. The list FactBox contract file is `list-fact-box-config.model.ts`.
Update partner source imports and configuration objects together. These changes
are local source migrations, not a published backwards-compatible SDK release.

Keep `Popup` for generic modal/drawer presentation and `RunModal` for the launch
capability. Existing command target values `entry` and `list` retain their
navigation meaning. Private CSS classes and persisted user-setting keys are
implementation details and are not partner extension contracts.

The package and Angular project are named `tecsa-erp-ui`. The deployment workflow
reads the matching `dist/tecsa-erp-ui/browser/` output; its remote destination is
unchanged. Naming changes do not publish, deploy or certify an SDK.

References: [Angular style guide](https://angular.dev/style-guide) and
[Business Central FactBoxes](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-adding-a-factbox-to-page).

## Shared list surface contract

Every connected list uses ListPage; DocumentPage and RunModal delegate list
rendering to it. A business page declares its columns, optional search overrides, capabilities,
filters and optional FactBox in configuration. It does not implement its own query
or copy the shared template. The visual hierarchy is page identity/actions, list
view/search/tools, active criteria, stable table headers, records and loaded counts.
Loading covers the record area; headers, column widths and toolbar remain present.

The second row owns search, filters, column personalization, density, saved views,
loaded-record grouping, details and default loaded-row export. The shell
does not duplicate those controls. Every displayed tool has a handler. Capabilities
can hide a tool; changing presentation never grants backend permissions.

Search composes all configured fields on the server. Each term can match any
configured target. Filters are staged and validated before Apply. Text expressions
support alternatives and edge wildcards; the current server permits ordered
comparisons/ranges on numeric/date fields. Unsupported text ranges are rejected
before querying. Keep the backend's type, whitelist, depth and paging limits.
Search text is temporary. Saved views include filters, configured view predicates,
sorting, column order/visibility/width, density, grouping and details visibility.
Preferences and saved filters are scoped to workspace, company, user and page.
Storage is presentation state; it never stores full ERP records or permissions.

FactBox is enabled by default unless config.factBox.enabled is false. Explicit
sections/bindings take priority, followed by opted-in column metadata. Otherwise
the shared component derives Record details from visible columns and a bounded
set of scalar API business fields. Honor hidden/opted-out fields. Do not dump nested
payloads, credentials or technical identifiers as automatic fields. An empty list
shows Select a record guidance. Filters and Details share the contextual side area;
Details remains available while filtering. Narrow layouts stack the context pane.

Grouping and all list export formats apply to loaded records and are labeled accordingly.
Neither represents server-wide aggregation or a full-dataset export job. Selection
also refers to loaded records. Paging remains server-side with bounded batches and
cursor restrictions. Decimal strings retain their exact precision in display and
export; date-only values do not shift with the user's time zone.

### Verification record (local, 20 October 2026)

| Feature | Verification / limit |
| --- | --- |
| Toolbar and headers during loading | Live desktop inspection and reload |
| Column show/hide/order and density | Live change and persistence across reload |
| Saved views | Live save, reload, restore filter/layout, then remove temporary review view |
| Text wildcard/alternative filter | Live server request accepted without a validation alert |
| FactBox empty state and layout | Live inspection; populated-record fallback requires records |
| Search across fields and typed ranges | Source/query-contract review; available fields vary by resource |
| Loaded-row grouping and export | Implemented; populated-record verification remains required |
| Record selection and continuation paging | Existing common contract retained; populated-record verification remains required |
| Source, imports and design tokens | No-emit Angular/TypeScript and repository static checks |

No automated test suite or production build was run for this local pass. These
checks do not certify production readiness or feature parity with another ERP.
Product labels and help use TecSA branding and neutral feature terminology.

Shared list typography uses TecSA semantic tokens: 20px page title, 16px section
heading, 14px body/controls, 13px column labels and 12px supporting text. Density
changes row height (36/44/52px), not text size. Table headings stay 40px while
loading. Details is the single FactBox toggle; do not add letter-only shortcuts
that duplicate it. Its pressed state reflects the visible context pane.

Standard list actions use StandardListActionsService in both shell and embedded
list toolbars. New, Delete and Refresh are present by default. Explicit
standardActions.<action>: false hides that action; object overrides customize it.
Unsupported operations and denied permissions remain disabled with a reason.
The shell passes standardActions through PageContext. Column sorting uses the
column heading and aria-sort, without reserving a separate sort-summary row.
Only applied filters or selection create a criteria strip.

Shared list tools are opt-out: omitted tools configuration enables search,
filters, columns, density, grouping, saved views, Details and export. A false
value disables the corresponding feature. PR uses these list defaults.
Search fields derive from non-hidden queryable column metadata unless an explicit
searchFields override is present. searchable:false excludes a field; filterable:false
excludes API-unsupported/calculated fields. Text uses contains, badges equality,
numeric/date input matches typed fields, and Yes/No matches boolean fields.

Export uses one neutral menu for XLSX, DOCX, CSV and browser Print / Save as PDF.
Scope is visible columns and currently loaded records, clearly stated in the menu.
Export does not fetch the entire dataset. Spreadsheet/document writers load on
first use. XLSX uses explicit strings to preserve identifiers and decimal precision.
Generated print documents use text nodes and existing theme colors/fonts.
Verification: XLSX and DOCX downloaded through the running browser and their
Office ZIP structures were inspected. Current data is empty, so these are header-only
exports. Print/PDF output and populated-data export still require visual verification.

No. Series page configuration
----------------------------
No. Series uses pageType: 'document'. Its feature config exports page, header and
line configurations. The list opens one document with General settings above the
numbering-range grid. The line navigation resolves /numberSeries/{systemId}/lines.
The separate numbering-range worksheet registration has been removed.
Saving follows the existing configured Save/Apply convention; this page retains
its original explicit Save command. Common list tools remain enabled by default.
