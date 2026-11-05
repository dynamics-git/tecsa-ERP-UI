# UI architecture rules

## Phase 2: Object Architecture

Object metadata and PR integration are authorized on the existing
`codex/tecsa-object-architecture` branch. Commit/push the focused implementation
and documentation there. Preserve Config + TypeScript + Shared Components;
Page configs add only optional objectId alongside pageId/pageType/title. Do not
repeat object names/types, sourceTable or codeunit bindings. Source relationships
are derived by Laravel's local developer Explorer; no frontend registry/map.
extend the existing page registry only for optional identity/lookup, never add
another renderer, CRUD layer, field registry or permission engine. This
supersedes historical commit deferrals below for this requested foundation.

Use Purchase Requisition as the reference for ordinary page/config structure.
Permission administration follows that same structure, not a second UI framework.

- `dataSource.keyField` identifies a record for CRUD. Do not copy it into a
  relationship or RunModal mapping merely because it is `systemId`.
- Declare business relationships through existing `headerPKProp`, `lineFKProp`
  and `parentFieldMap`. Composite filters must match every required field.
- RunModal maps the chosen header or selected line's business fields to target
  fields. A card resolves that filter to one API record; zero or multiple matches
  must not open an arbitrary record or create a new one.
- Keep ordinary CRUD/autosave in shared core. Do not add a page save port,
  `autoSave: true`, manual Save button, or nested endpoint for an ordinary
  permission table. Business invariants belong to backend lifecycle hooks.
- Preserve company/workspace authorization, row versions, field types and shared
  visual design. Do not hide data-loading failures by changing grid rendering.
- Check the actual table/API contract and config together before claiming
  completion. Cover business-key filters and selected-row navigation in tests.
- Leave current changes uncommitted for user review. Other business modules and
  SDK generation remain separate work; do not mass-convert their relationships.
- Update the relevant `docs/learn` article with every changed API/config/core
  behavior and add a dated maintenance/what's-new entry for completed work.
  Keep examples consistent with Users/PR and mark compatibility/future behavior.
  Do not edit generated documentation JSON; run `npm run docs:check`.
