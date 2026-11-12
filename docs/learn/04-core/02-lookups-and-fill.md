# Lookups, selected values and fill

A lookup selects a value from another source. Keep its stored business value, displayed caption and the selected record's CRUD identity distinct.

## Store a code and display a name

```typescript
{
  key: 'permissionSetCode',
  label: 'Permission Set',
  type: 'lookup',
  lookup: {
    endpoint: '/permissionSets',
    valueField: 'code',
    displayField: 'name',
    searchFields: ['code', 'name'],
    recordRead: 'collection',
  },
}
```

`valueField: 'code'` means the form stores the selected set's code. `displayField: 'name'` controls its caption. `keyField: 'systemId'` elsewhere identifies records for CRUD; it does not mean all lookups must store a system ID.

`recordRead: 'collection'` resolves a stored business value by filtering the collection when a record URL expects the system ID. The shared reader verifies the returned `valueField` matches the requested identity; missing or duplicate identities fail instead of displaying an arbitrary first record. Do not send `SUPER` to a `{systemId}` record endpoint and expect it to be a GUID.

Configured `lookup` owns its paged choices even if a compatibility `type: 'dropdown'`
or `api` remains on a header field. The page's legacy dropdown loader does not run
alongside it. Opening and fresh cached reads are immediate; only uncached typed
searches are debounced. Header and line dropdowns request ten choices per page.
Scrolling requests the next page only when the server reports more results;
typing starts a new server-filtered page. Reopening or switching rows while the
same request is pending transfers the subscription before cancelling the old
listener, so the shared request is reused rather than aborted and restarted.
Opening with the arrow, focus or keyboard preserves the current displayed value.
Typing edits only the search text; Escape or closing restores the selected caption.
Only choosing a result or the explicit Clear selection action changes the stored value.
The popup measures its position on opening, size changes,
scroll and window resize, rather than forcing layout on every Angular view check.
The shared data cache uses a compact revision of stored access settings instead
of parsing and serializing the entire permission matrix for each record/cache key.
Changes to stored grants (including another tab), company, workspace, user or
token still invalidate reads and reject obsolete in-flight responses.

The HLB reference control requests choices while initializing a field and reuses
its URL cache, explaining why choices can already be present when opened.
That HLB preload is not copied for large ERP master tables. The document host
does not preload unrelated first pages. Existing saved identities resolve directly
with a bounded filter for those identities; they never wait for a choice page
that might not contain them. The first ten choices load when the user opens a
dropdown, with configured filters/dependencies and backend search. Identical reads
share pending requests and fresh scoped cache entries. Closing a header dropdown
allows its one bounded request to finish into that cache; reopening can reuse it.
Failures retain the normal load-error/retry path. Cold selected-name reads still
depend on server latency when the response and cache contain only codes.

External references inform the design, not a replacement framework:
[Business Central API performance](https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/webservices/odata-client-performance)
recommends limiting fields/results and server-driven paging for BC APIs.
[SAP selection guidance](https://www.sap.com/design-system/fiori-design-web/v1-148/foundations/best-practices/ui-elements/which-selection-control-to-use)
distinguishes small fixed lists from large searchable selections. Ten is this
product's requested initial page size, not a claimed universal BC/SAP setting.
The Laravel resource's declared offset/cursor contract remains authoritative;
BC-specific OData paging rules are not blindly applied to a different backend.

## Selected values during ordinary Card loading

The existing dynamic form resolves header captions and the line grid resolves
selected line captions. The page does not run a second initial caption pass.
Each completed selected-value batch publishes its caption and configured read-only
fills together. It does not wait for other lookup resources or later batches.
Cached selected values follow the same path immediately. Generation, identity,
dependency and field-value checks reject late results after an edit or navigation.
Header/line record requests still determine whether loading succeeded; optional
captions do not hold the Card skeleton after its business rows arrive. Lookup
failures/restricted values retain their field indicators rather than becoming
successful empty data. Users assignment responses carry their stored codes;
the configured lookup/fill resolves display names from existing scoped choice
data or bounded selected-value reads. Caption-derived read-only fills do not cause PATCH requests or overwrite
newer values. Header captions start from confirmed Card data rather than its
temporary opening seed.

Saved codes whose display field is the same code render directly, without a
master read. An explicitly mapped name already returned on the row also renders
directly through the existing `fill` mapping. Initial display never refills or
replaces an editable saved Description from a master. A dropdown selection uses
the record already present in its choices to fill targets synchronously; it does
not fetch that record again. Only genuinely missing names need a selected-value
read. Unrelated `name` properties are not guessed as another field's caption.

Users declares `fill: {permissionSetName: 'name'}` in its line config. The selected
permission-set record supplies that value; the assignment API does not invent a
virtual Name field. A fresh exact choice page can supply a display/fill record
even when it is a partial DTO. Such a DTO is not promoted to a complete CRUD
record cache. Dependencies, resource and session/company/workspace scope still
have to match. A saved code outside that page uses the bounded selected read.
On selection, all configured fill targets use the already chosen record, including
editable targets. Config decides readonly; Core does not recognize a special Name
field. Initial hydration preserves editable stored values.

For alternative lookups bound to the same field, only the row's active
`editableWhen` binding resolves a selected value. PR Item lines resolve `number`
against Items; G/L Account lines resolve it against G/L Accounts. Selected line
identities remain batched in groups of 40 with at most six requests at once and
without exact master-table counts. Older option aliases remain compatibility
behavior; no separate lookup or CRUD runtime is added.

## Fill another field

Selected-value batches also reuse fresh records from previous selected batches
in the same exact dependency scope. This uses metadata on the existing bounded
page cache, not another record store. A later batch with one known and one new
code requests only the new code. Partial display DTOs remain ineligible as full
CRUD records. The internal scope marker is never an API query parameter; Company,
workspace, access, resource invalidation and the 30-second freshness rule remain.
An initially missing name still needs a bounded read; this does not promise zero
requests on cold entry.

```typescript
fill: {
  description: 'description',
}
```

The left side is the destination field on the current record. The right side is the property on the selected lookup result. Only declare real fields supported by the relevant form/API contract.

In Page Permissions, `fill: {apiSource: 'apiSource'}` copies the selected catalog entry's API source name into the permission rule's `apiSource` field. That name binds field protection to a published backend source. It is not a new name for the page, a backend fillable array or a second table registration.

## Dependent lookup

```typescript
lookup: {
  endpoint: '/exampleVariants',
  valueField: 'code',
  displayField: 'description',
  recordRead: 'collection',
  dependsOn: [{
    source: 'record',
    in: 'filter',
    field: 'itemNumber',
    valueFrom: 'itemNumber',
  }],
}
```

This endpoint is illustrative. `field` names the lookup source's filter field; `valueFrom` names the current record field supplying the value. Line lookups can use `source: 'header'` for parent context. Dependencies must be present before searching. Fixed `filter` is combined with dependency and search clauses.

Use `in: 'path'` only for an API contract that explicitly expects a dependency in the REST path. Flat ordinary sources do not need nested paths simply because their UI is a child grid.

## Options and clearing

For a small fixed enum, use `type: 'select'` with `options: [{label, value}]`. `optionsDataKey` identifies supplied option data in the supported runtime. Line columns can declare `clearFieldsOnChange` to clear dependent values when a driving field changes.

## Compatibility aliases

Older configurations may contain top-level `valueField`, `labelField`, `api` or options endpoint aliases. New lookup configs use the nested `lookup` object consistently. Do not keep both forms in the same new field to “make it work.”
