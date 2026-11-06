# Detailed field contract

## BC-style Page fields and existing Core

New thin ordinary CRUD Pages can declare just the field identity and caption:

```typescript
{key: 'code', label: 'Code'}
```

Every published source is resolved against the current Company's `fieldContracts`
API, including fields with explicit `type` or `valueType` presentation settings, before
constructing the editor. A PostgreSQL `varchar(20)` is therefore limited to
20 characters without repeating `maxLength: 20` in the Page. Defaults,
precision/scale and writable state follow the same existing schema-backed
ApiSource. Page-owned layout, captions, quick entry, presentation conditions,
explicit create prerequisites and command placement remain declarative.

The shared metadata resolver cannot loosen physical limits with a Page-level
validation override. Header/line create-required fields are derived **after**
field hydration; legitimate explicit `requiredCreateFields` remain supported.
An unavailable metadata API retains older explicit configs, but thin Pages must
be tested against the actual published API. Backend business validation and
permissions are never replaced by editor assistance. No new CRUD, permission,
posting or Object execution engine was created.

## Page Object source and relationship defaults

An Object-backed page declares its existing `objectId` once. Core requests
`fieldContracts?objectId=...`; the existing backend ObjectRegistry identifies the
Page's ApiSource. Its existing ownership declaration and PostgreSQL FK resolver
supply the complete Header–Line business-key binding. No endpoint, record key,
`headerPKProp`, `lineFKProp`, `parentFieldMap`, or parent invalidation list is
required in that page's normal config. `systemId` remains the record identity.

Use `ObjectPageConfig` and `ObjectLineConfig` to omit those source declarations.
Keep Header Config, Line Config, the thin TypeScript component and shared
components. UI overrides such as captions, layout, a textarea editor, today's
request date or a page size remain explicit. They cannot widen physical limits,
enable a denied write, or substitute a different ownership key. If several
published owned collections exist, `relationship` selects one existing source
name; Core never guesses. This is a projection/cache of existing metadata, not
another object or relationship registry.

An Object-backed page stops before CRUD when its contract is unavailable or
contradictory. Older explicit-endpoint pages retain their compatibility fallback
on discovery failure; they still attempt source discovery regardless of editor
type. Local read-only UI catalogs do not request PostgreSQL contracts. Source
contracts are shared per authenticated user/workspace/Company and invalidated
with the existing access/read generation. One Object request includes its
authorized header and line shapes; opening their editors reuses that response.

Authorized write-only fields have `read: false` and effective create/update flags
in the contract, without a sensitive default or record value. UI can send those
inputs; normal record reads and responses continue to omit them. A lookup with a
business `valueField` defaults to a filtered collection read; a UUID record lookup
retains record addressing. An explicit `recordRead` remains available.

Resolved schema defaults do not create an untouched line. First-input readiness
compares existing declared/default values and derives create prerequisites after
field resolution; it does not turn physical defaults into user edits.

## Document readiness and selected lookup captions

The saved header and line responses determine document readiness. Selected lookup
names load independently in the existing shared form/line components; the page
must not wait for those names a second time before publishing its rows. Code-to-code
lookups display the saved code while the selected caption is pending. Background
caption completion preserves in-progress edits and never saves business data.

An unchanged complete list record can supply its card header. A write-only password
input is intentionally absent from read responses and does not make that record
incomplete. Changed, partial or invalidated records still require their normal read.

This field guide is rendered directly from the maintained repository contract. It complements the validation tutorial and generated type reference.

<!-- guide: docs/field-contract-guide.md -->
