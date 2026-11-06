# Detailed field contract

## BC-style Page fields and existing Core

New thin ordinary CRUD Pages can declare just the field identity and caption:

```typescript
{key: 'code', label: 'Code'}
```

When a header or line leaves its physical editor type unspecified, the shared
Page initializes against the current Company's `fieldContracts` API before
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
