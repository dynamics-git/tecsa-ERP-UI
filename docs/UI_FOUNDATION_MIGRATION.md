# F1 foundation implementation report

Implemented on `refactor/tecsa-ui-foundation-cleanup` for draft PR #12. The authoritative naming specification remains [UI_FOUNDATION_RULES.md](UI_FOUNDATION_RULES.md).

## Result

The live implementation now resides in `core/`, `layout/`, `platform/{pages,document,run-modal,data,models}/`, `shared/ui/`, and the current auth, dashboard and Purchase Order features. Removed the old `src/app/pages/`, `src/app/shared/erp-core/` and `src/app/layout/actions/` trees after migration. No empty future modules or duplicate implementations remain.

Components, selectors, templates, imports, providers, models, tests and public exports now use the approved names. Renamed the stack service/policy, document configuration/event types, document page support services, runtime value mapper/timeout policy, and layout governance provider. Kept business payload keys, permission keys, saved popup structures, API endpoints, document calculations and design tokens unchanged. SCSS files are unchanged apart from component selectors and the host CSS class renamed together with their templates.

Login and the working profile drawer moved into `features/auth/`; the unused standalone profile page was deleted. Essential authorization/session/API services remain in `core/`. Purchase Order moved into `features/purchasing/purchase-order/`; dashboard remains in `features/dashboard/`. Unused NgModule wrappers were deleted.

Customer and administration screens were removed together with their routes, menu/search entries and RunModal registrations. Only Purchase Order is registered. Retired URLs redirect through the existing guarded shell. Menus/search still enforce page visibility and do not expose empty modules.

The existing RunModal stack and document host behavior is retained, including the configured 50-level replace-top policy and explicitly unlimited policy support. A dashboard host was added because the existing shell had no host to render global-search windows there. The Purchase Order DocumentPage keeps its host and original document action/close handlers.

Feature code uses `platform/public-api.ts` or `shared/ui/public-api.ts`. Import-boundary checks now scan all application TypeScript, including feature tests, reject retired imports, and reject feature imports into foundation internals. Internal hydration/binding/resolver helpers are not published in the platform barrel.

## Validation

| Check | Baseline | Final |
| --- | --- | --- |
| `npm ci` | Pass | Pass |
| `npm run lint` | Pass | Pass |
| `npm run build` | Pass | Pass |
| `npm test -- --watch=false` | 4 passed, 5 failed | 21 passed, 0 failed (7 test files) |

All nine original tests remain. Fixed the stale starter-title test to check the actual route outlet; supplied the real router and foundation governance providers in shell/header tests; corrected the nonempty create payload expectation; supplied explicit save datasource/sections so the mocked server rejection is actually exercised. Retained the BC-shaped transport compatibility tests and changed no Laravel adapter behavior. Added separate empty-create and missing-save-configuration checks to assert that neither sends a request.

RunModal regression coverage exercises global-search list opening without route navigation, child header/line hydration, close-to-list with retained rows/maximize state, three mounted document levels, retained unsaved parent header/line edits and maximize state, global search over an active document, drawer/confirmation close context, unknown legacy registration rejection, and approved/unlimited stack depth. Header Ctrl K and dashboard host coverage are included. Navigation tests verify that routes, search and registrations agree and continue to enforce visibility.

A Windows dependency reinstall lock required stopping the repository's build worker before rerunning npm ci. Dependencies were restored and the final checks rerun.

## Unresolved acceptance

Manual browser visual acceptance could not be completed. The local fixture-only smoke bundle built successfully, but Computer Use stopped because it could not determine Chrome's current URL with enough confidence to enforce policy. No live backend acceptance is claimed. Before merge, manually verify nested document opening, header/line loading, return to parent, unsaved state, drawers, and maximize/restore in the browser. PR #12 remains draft; main was not merged or deployed.

## Exact file moves (105)

Paths are relative to the repository root. This includes the old public API replaced with the final platform barrel.

| From | To |
| --- | --- |
| `src/app/core/providers/erp-core-governance.provider.ts` | `src/app/core/providers/platform-governance.provider.ts` |
| `src/app/layout/actions/actions.html` | `src/app/layout/page-actions/page-actions.html` |
| `src/app/layout/actions/actions.scss` | `src/app/layout/page-actions/page-actions.scss` |
| `src/app/layout/actions/actions.ts` | `src/app/layout/page-actions/page-actions.ts` |
| `src/app/pages/login/login.html` | `src/app/features/auth/login/login.html` |
| `src/app/pages/login/login.scss` | `src/app/features/auth/login/login.scss` |
| `src/app/pages/login/login.ts` | `src/app/features/auth/login/login.ts` |
| `src/app/pages/profile/profile-drawer.html` | `src/app/features/auth/profile/profile-drawer.html` |
| `src/app/pages/profile/profile-drawer.scss` | `src/app/features/auth/profile/profile-drawer.scss` |
| `src/app/pages/profile/profile-drawer.ts` | `src/app/features/auth/profile/profile-drawer.ts` |
| `src/app/pages/purchase-order/purchase-order.config.ts` | `src/app/features/purchasing/purchase-order/purchase-order.config.ts` |
| `src/app/pages/purchase-order/purchase-order.html` | `src/app/features/purchasing/purchase-order/purchase-order.html` |
| `src/app/pages/purchase-order/purchase-order.ts` | `src/app/features/purchasing/purchase-order/purchase-order.ts` |
| `src/app/pages/run-modal-page-modules.ts` | `src/app/features/run-modal-page-modules.ts` |
| `src/app/shared/erp-core/components/command-bar/command-bar.html` | `src/app/shared/ui/command-bar/command-bar.html` |
| `src/app/shared/erp-core/components/command-bar/command-bar.scss` | `src/app/shared/ui/command-bar/command-bar.scss` |
| `src/app/shared/erp-core/components/command-bar/command-bar.ts` | `src/app/shared/ui/command-bar/command-bar.ts` |
| `src/app/shared/erp-core/components/confirmation-modal/confirmation-modal.html` | `src/app/shared/ui/confirmation-dialog/confirmation-dialog.html` |
| `src/app/shared/erp-core/components/confirmation-modal/confirmation-modal.scss` | `src/app/shared/ui/confirmation-dialog/confirmation-dialog.scss` |
| `src/app/shared/erp-core/components/confirmation-modal/confirmation-modal.ts` | `src/app/shared/ui/confirmation-dialog/confirmation-dialog.ts` |
| `src/app/shared/erp-core/components/document-runtime/document-runtime.html` | `src/app/platform/pages/document-page/document-page.html` |
| `src/app/shared/erp-core/components/document-runtime/document-runtime.ts` | `src/app/platform/pages/document-page/document-page.ts` |
| `src/app/shared/erp-core/components/drawer-host/drawer-host.html` | `src/app/shared/ui/drawer-host/drawer-host.html` |
| `src/app/shared/erp-core/components/drawer-host/drawer-host.scss` | `src/app/shared/ui/drawer-host/drawer-host.scss` |
| `src/app/shared/erp-core/components/drawer-host/drawer-host.ts` | `src/app/shared/ui/drawer-host/drawer-host.ts` |
| `src/app/shared/erp-core/components/entry-dialog/entry-dialog.html` | `src/app/platform/document/document-window/document-window.html` |
| `src/app/shared/erp-core/components/entry-dialog/entry-dialog.scss` | `src/app/platform/document/document-window/document-window.scss` |
| `src/app/shared/erp-core/components/entry-dialog/entry-dialog.ts` | `src/app/platform/document/document-window/document-window.ts` |
| `src/app/shared/erp-core/components/fact-panel-renderer/fact-panel-renderer.html` | `src/app/shared/ui/fact-box/fact-box.html` |
| `src/app/shared/erp-core/components/fact-panel-renderer/fact-panel-renderer.scss` | `src/app/shared/ui/fact-box/fact-box.scss` |
| `src/app/shared/erp-core/components/fact-panel-renderer/fact-panel-renderer.ts` | `src/app/shared/ui/fact-box/fact-box.ts` |
| `src/app/shared/erp-core/components/form-renderer/form-renderer.html` | `src/app/shared/ui/dynamic-form/dynamic-form.html` |
| `src/app/shared/erp-core/components/form-renderer/form-renderer.scss` | `src/app/shared/ui/dynamic-form/dynamic-form.scss` |
| `src/app/shared/erp-core/components/form-renderer/form-renderer.ts` | `src/app/shared/ui/dynamic-form/dynamic-form.ts` |
| `src/app/shared/erp-core/components/line-renderer/line-renderer.html` | `src/app/platform/document/document-lines/document-lines.html` |
| `src/app/shared/erp-core/components/line-renderer/line-renderer.scss` | `src/app/platform/document/document-lines/document-lines.scss` |
| `src/app/shared/erp-core/components/line-renderer/line-renderer.ts` | `src/app/platform/document/document-lines/document-lines.ts` |
| `src/app/shared/erp-core/components/list-fact-panel/list-fact-panel.html` | `src/app/platform/pages/list-fact-box/list-fact-box.html` |
| `src/app/shared/erp-core/components/list-fact-panel/list-fact-panel.scss` | `src/app/platform/pages/list-fact-box/list-fact-box.scss` |
| `src/app/shared/erp-core/components/list-fact-panel/list-fact-panel.ts` | `src/app/platform/pages/list-fact-box/list-fact-box.ts` |
| `src/app/shared/erp-core/components/list-filter-panel/list-filter-panel.html` | `src/app/platform/pages/list-filter-panel/list-filter-panel.html` |
| `src/app/shared/erp-core/components/list-filter-panel/list-filter-panel.scss` | `src/app/platform/pages/list-filter-panel/list-filter-panel.scss` |
| `src/app/shared/erp-core/components/list-filter-panel/list-filter-panel.ts` | `src/app/platform/pages/list-filter-panel/list-filter-panel.ts` |
| `src/app/shared/erp-core/components/list-page/list-page.html` | `src/app/platform/pages/list-page/list-page.html` |
| `src/app/shared/erp-core/components/list-page/list-page.scss` | `src/app/platform/pages/list-page/list-page.scss` |
| `src/app/shared/erp-core/components/list-page/list-page.ts` | `src/app/platform/pages/list-page/list-page.ts` |
| `src/app/shared/erp-core/components/popup-host/popup-host.html` | `src/app/platform/run-modal/run-modal-host/run-modal-host.html` |
| `src/app/shared/erp-core/components/popup-host/popup-host.scss` | `src/app/platform/run-modal/run-modal-host/run-modal-host.scss` |
| `src/app/shared/erp-core/components/popup-host/popup-host.ts` | `src/app/platform/run-modal/run-modal-host/run-modal-host.ts` |
| `src/app/shared/erp-core/config/entity-contract-profiles.ts` | `src/app/platform/data/entity-contract-profiles.ts` |
| `src/app/shared/erp-core/constants/entry-footer-presets.ts` | `src/app/platform/models/document-footer-presets.ts` |
| `src/app/shared/erp-core/constants/generic-messages.ts` | `src/app/platform/models/generic-messages.ts` |
| `src/app/shared/erp-core/models/command-config.model.ts` | `src/app/platform/models/command-config.model.ts` |
| `src/app/shared/erp-core/models/confirmation-dialog-config.model.ts` | `src/app/platform/models/confirmation-dialog-config.model.ts` |
| `src/app/shared/erp-core/models/data-source-config.model.ts` | `src/app/platform/models/data-source-config.model.ts` |
| `src/app/shared/erp-core/models/data-surface-config.model.ts` | `src/app/platform/models/data-surface-config.model.ts` |
| `src/app/shared/erp-core/models/entity-contract.model.ts` | `src/app/platform/models/entity-contract.model.ts` |
| `src/app/shared/erp-core/models/entry-dialog-config.model.ts` | `src/app/platform/models/document-window-config.model.ts` |
| `src/app/shared/erp-core/models/field-config.model.ts` | `src/app/platform/models/field-config.model.ts` |
| `src/app/shared/erp-core/models/line-calculation-config.model.ts` | `src/app/platform/models/line-calculation-config.model.ts` |
| `src/app/shared/erp-core/models/line-config.model.ts` | `src/app/platform/models/line-config.model.ts` |
| `src/app/shared/erp-core/models/list-filter-config.model.ts` | `src/app/platform/models/list-filter-config.model.ts` |
| `src/app/shared/erp-core/models/list-page-factbox-config.model.ts` | `src/app/platform/models/list-fact-box-config.model.ts` |
| `src/app/shared/erp-core/models/page-config.model.ts` | `src/app/platform/models/page-config.model.ts` |
| `src/app/shared/erp-core/models/popup-config.model.ts` | `src/app/platform/models/popup-config.model.ts` |
| `src/app/shared/erp-core/models/popup-host-data.model.ts` | `src/app/platform/models/run-modal-host-data.model.ts` |
| `src/app/shared/erp-core/services/action-dispatcher.service.ts` | `src/app/shared/ui/action-dispatcher.service.ts` |
| `src/app/shared/erp-core/services/api-error.service.ts` | `src/app/platform/data/api-error.service.ts` |
| `src/app/shared/erp-core/services/confirmation.service.ts` | `src/app/shared/ui/confirmation.service.ts` |
| `src/app/shared/erp-core/services/core-drawer.service.ts` | `src/app/shared/ui/drawer.service.ts` |
| `src/app/shared/erp-core/services/data-source.service.ts` | `src/app/platform/data/data-source.service.ts` |
| `src/app/shared/erp-core/services/document-runtime-command-routing-resolver.service.ts` | `src/app/platform/pages/document-page-command-routing-resolver.service.ts` |
| `src/app/shared/erp-core/services/document-runtime-data-source-resolver.service.ts` | `src/app/platform/pages/document-page-data-source-resolver.service.ts` |
| `src/app/shared/erp-core/services/document-runtime-list-lifecycle.service.ts` | `src/app/platform/pages/document-page-list-lifecycle.service.ts` |
| `src/app/shared/erp-core/services/draft-create.service.ts` | `src/app/platform/data/draft-create.service.ts` |
| `src/app/shared/erp-core/services/enterprise-persistence.integration.spec.ts` | `src/app/platform/data/enterprise-persistence.integration.spec.ts` |
| `src/app/shared/erp-core/services/entity-contract.service.ts` | `src/app/platform/data/entity-contract.service.ts` |
| `src/app/shared/erp-core/services/entry-config-data.service.ts` | `src/app/platform/data/document-config-data.service.ts` |
| `src/app/shared/erp-core/services/entry-hydration-orchestrator.service.ts` | `src/app/platform/data/document-hydration-orchestrator.service.ts` |
| `src/app/shared/erp-core/services/entry-payload.service.ts` | `src/app/platform/data/document-payload.service.ts` |
| `src/app/shared/erp-core/services/entry-record.service.ts` | `src/app/platform/data/document-record.service.ts` |
| `src/app/shared/erp-core/services/entry-response-normalizer.service.ts` | `src/app/platform/data/document-response-normalizer.service.ts` |
| `src/app/shared/erp-core/services/entry-save.port.ts` | `src/app/platform/data/document-save.port.ts` |
| `src/app/shared/erp-core/services/entry-state.service.ts` | `src/app/platform/data/document-state.service.ts` |
| `src/app/shared/erp-core/services/erp-runtime-timeout-policy.token.ts` | `src/app/platform/data/runtime-timeout-policy.token.ts` |
| `src/app/shared/erp-core/services/erp-runtime-value-mapper.service.ts` | `src/app/platform/data/runtime-value-mapper.service.ts` |
| `src/app/shared/erp-core/services/field-validation.service.ts` | `src/app/platform/document/field-validation.service.ts` |
| `src/app/shared/erp-core/services/line-calculation.service.ts` | `src/app/platform/document/line-calculation.service.ts` |
| `src/app/shared/erp-core/services/line-command.service.ts` | `src/app/platform/document/line-command.service.ts` |
| `src/app/shared/erp-core/services/line-master.service.ts` | `src/app/platform/data/line-master.service.ts` |
| `src/app/shared/erp-core/services/list-filter-state.service.ts` | `src/app/platform/pages/list-filter-state.service.ts` |
| `src/app/shared/erp-core/services/list-filter.service.ts` | `src/app/platform/pages/list-filter.service.ts` |
| `src/app/shared/erp-core/services/master-data.service.ts` | `src/app/platform/data/master-data.service.ts` |
| `src/app/shared/erp-core/services/page-command.service.ts` | `src/app/platform/pages/page-command.service.ts` |
| `src/app/shared/erp-core/services/popup-stack-policy.token.ts` | `src/app/platform/run-modal/run-modal-stack-policy.token.ts` |
| `src/app/shared/erp-core/services/popup-stack.service.ts` | `src/app/platform/run-modal/run-modal-stack.service.ts` |
| `src/app/shared/erp-core/services/run-modal-binding-state.service.ts` | `src/app/platform/run-modal/run-modal-binding-state.service.ts` |
| `src/app/shared/erp-core/services/run-modal-config-assembler.service.ts` | `src/app/platform/run-modal/run-modal-config-assembler.service.ts` |
| `src/app/shared/erp-core/services/run-modal-config.token.ts` | `src/app/platform/run-modal/run-modal-config.token.ts` |
| `src/app/shared/erp-core/services/run-modal-hydration-resolver.service.ts` | `src/app/platform/run-modal/run-modal-hydration-resolver.service.ts` |
| `src/app/shared/erp-core/services/run-modal-loading.service.ts` | `src/app/platform/run-modal/run-modal-loading.service.ts` |
| `src/app/shared/erp-core/services/run-modal-options-resolver.service.ts` | `src/app/platform/run-modal/run-modal-options-resolver.service.ts` |
| `src/app/shared/erp-core/services/run-modal-payload-builder.service.ts` | `src/app/platform/run-modal/run-modal-payload-builder.service.ts` |
| `src/app/shared/erp-core/services/run-modal.service.ts` | `src/app/platform/run-modal/run-modal.service.ts` |
| `src/app/shared/erp-core/public-api.ts` | `src/app/platform/public-api.ts` |

## Exact file deletions (41)

These are deletions in this implementation change; the 26 obsolete artifacts already deleted earlier on the draft branch are unchanged.

- `src/app/features/dashboard/dashboard-module.ts`
- `src/app/features/dashboard/dashboard-routing-module.ts`
- `src/app/layout/layout-module.ts`
- `src/app/pages/application-page-setup/application-page-setup.config.ts`
- `src/app/pages/application-page-setup/application-page-setup.html`
- `src/app/pages/application-page-setup/application-page-setup.ts`
- `src/app/pages/companies/companies.config.ts`
- `src/app/pages/companies/companies.html`
- `src/app/pages/companies/companies.ts`
- `src/app/pages/company-setup/company-setup.config.ts`
- `src/app/pages/company-setup/company-setup.html`
- `src/app/pages/company-setup/company-setup.ts`
- `src/app/pages/customer-ledger-entry/customer-ledger-entry.config.ts`
- `src/app/pages/customer-ledger-entry/customer-ledger-entry.html`
- `src/app/pages/customer-ledger-entry/customer-ledger-entry.ts`
- `src/app/pages/customer-master/customer-master.config.ts`
- `src/app/pages/customer-master/customer-master.html`
- `src/app/pages/customer-master/customer-master.ts`
- `src/app/pages/page-field-setup/page-field-setup.config.ts`
- `src/app/pages/page-field-setup/page-field-setup.html`
- `src/app/pages/page-field-setup/page-field-setup.ts`
- `src/app/pages/permission-field-rule-setup/permission-field-rule-setup.config.ts`
- `src/app/pages/permission-field-rule-setup/permission-field-rule-setup.html`
- `src/app/pages/permission-field-rule-setup/permission-field-rule-setup.ts`
- `src/app/pages/permission-set-setup/permission-set-setup.config.ts`
- `src/app/pages/permission-set-setup/permission-set-setup.html`
- `src/app/pages/permission-set-setup/permission-set-setup.ts`
- `src/app/pages/profile/profile.html`
- `src/app/pages/profile/profile.scss`
- `src/app/pages/profile/profile.ts`
- `src/app/pages/role-setup/role-setup.config.ts`
- `src/app/pages/role-setup/role-setup.html`
- `src/app/pages/role-setup/role-setup.ts`
- `src/app/pages/user-setup/user-setup.config.ts`
- `src/app/pages/user-setup/user-setup.html`
- `src/app/pages/user-setup/user-setup.ts`
- `src/app/shared/erp-core/components/index.ts`
- `src/app/shared/erp-core/constants/index.ts`
- `src/app/shared/erp-core/index.ts`
- `src/app/shared/erp-core/models/index.ts`
- `src/app/shared/erp-core/services/index.ts`
