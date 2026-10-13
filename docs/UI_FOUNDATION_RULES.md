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

This is the intended final location. Move existing working files rather than inventing new duplicate implementations. The existing `src/app/shared/erp-core/` is currently the **live implementation** and must be removed **only after** all its required files are relocated and imports, providers, templates, exports and tests point to the new locations. No empty future module folders.

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
