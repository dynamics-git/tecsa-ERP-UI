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
