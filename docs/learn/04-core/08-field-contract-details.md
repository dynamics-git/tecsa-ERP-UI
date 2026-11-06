# Detailed field contract

## Configured fields and defaults

The retired `apiCapabilities` discovery is not a UI configuration source.
Fields use their declared types, validation, defaults, lookup settings and
presentation. Omitting `defaultValue` does not imply `null`; explicit `null`,
zero, false and empty-string defaults retain their declared meaning. Actual
record values returned by CRUD are kept. Backend schema validation, Company
scope and write authorization remain authoritative on each API request.

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
