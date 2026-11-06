# Detailed field contract

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
