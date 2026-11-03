# Architecture and development rules

Use one development pattern across modules. Add a business exception only when the business contract needs it, and document why the shared default is insufficient.

## Responsibilities by layer

| Layer | Owns | Avoid |
| --- | --- | --- |
| Database migration | Data shape, uniqueness, FK constraints, business keys | Relying on UI filters to enforce integrity |
| Model / backend behavior | Business invariants, transactional effects, audit-aware writes | Repeating generic CRUD in each module |
| API source and shared runtime | Published resource, scopes, schema metadata, CRUD and query contract | Per-table global registrations and duplicate field maps |
| Page config | Presentation, data binding, relation filters, declared commands | Copying core save/navigation logic |
| Page TS | Genuine orchestration using the public API | Direct mutation that bypasses validation/autosave |
| Shared UI core | Editors, lifecycle, navigation, grid behavior, permissions | Page-name-specific special cases |

## Names developers can predict

Use API field names consistently in config. Record identity is `keyField`. Header-to-line matching uses `headerPKProp` and `lineFKProp`. Additional matching fields use `parentFieldMap` with child field on the left and header field on the right.

`lookup.valueField` is a selected value, not a competing name for record identity. A permission-set lookup can store its `code` while that set's CRUD endpoint still uses `systemId`.

Use `type` for newly authored fields. Some reference interfaces retain `valueType`, legacy lookup aliases or `addressStyle: 'odata'` to read older configurations. Compatibility availability is not a recommendation for new pages.

## Shared defaults stay shared

- Omit `autoSave: true` on ordinary pages. Core selects autosave when no manual Save/Apply policy is declared.
- Omit standard New, Delete and Refresh commands unless a real override is required.
- Do not add a page save adapter or collection PUT endpoint to implement ordinary row CRUD.
- Do not add module-specific imports to the shared RunModal registry. Feature-folder discovery supplies pages.
- Keep presentation tokens and grid behaviors in shared UI. Field types and editability come from config; page CSS must not fake authorization.
- Do not introduce ERP prefixes into new code identifiers. Existing database names and deployment environment variables are outside that naming cleanup.

## Business rules are authoritative on the server

UI validation improves entry and feedback. Database constraints and backend rules still enforce integrity for all clients. A hidden button is not API authorization. A copied header value is not a cascading transactional rule.

## Exceptions must be explicit

Posted records, immutable system permission sets, secret fields, singleton setups, numbering and domain commands legitimately need constraints. Prefer a source option or existing lifecycle hook. Do not alter unrelated core behavior to make one module or test pass.

## Before declaring a page ready

Verify the database/API/config contract together: business-key filters, selected-row navigation, create/edit/delete behavior, permission denial, empty and populated grids, stale-write handling and visible errors. A successful build proves compilation; it does not prove browser behavior or business correctness.

## Repository rules

The following is the current frontend instruction file, included directly from the repository:

<!-- source: AGENTS.md -->
