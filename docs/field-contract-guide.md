# Field configuration: current supported contract

Use valueType for stored value semantics. Use type only to select a particular editor (lookup, dropdown, textarea, etc.).

| valueType | Behaviour |
| --- | --- |
| text | Preserves text |
| code | Trims surrounding spaces and uppercases on field commit and payload construction |
| integer | Numeric editor; validates safe whole numbers |
| decimal | Text editor with decimal input mode; decimal string preserved in payloads to avoid rounding; arithmetic remains backend-owned |
| number | Existing compatible numeric type |
| boolean | Checkbox and boolean value conversion |
| date | Date editor; validates YYYY-MM-DD calendar date |
| datetime | Local datetime editor; committed values use ISO UTC timestamps |
| time | Time editor with clock validation |
| guid | Identifier validation; normalized lowercase representation |
| email / url / phone | Native contact editor; email and HTTP(S) URL validation |

## Header

```ts
{ key: 'code', label: 'Code', valueType: 'code', required: true,
  validation: { maxLength: 20 } }
```

## Line

Declare type and validation on each column once. The platform derives validation fields and writable-field defaults. Existing separate fields arrays remain supported for older pages.

```ts
{ id: 'startingNo', label: 'Starting No.', valueType: 'code',
  required: true, validation: { maxLength: 20 } }
{ id: 'incrementBy', label: 'Increment By', valueType: 'integer',
  defaultValue: 1, required: true, validation: { min: 1 } }
```

No. Series is the reference at src/app/features/administration/no-series/no-series.config.ts.
Do not duplicate field conversion or payload construction inside feature configuration.
Explicit conflicting column/field value types fail during configuration resolution.
Read-only line numbers remain backend assigned.

## Boundaries

Code is not a uniqueness declaration. Database unique constraints remain authoritative.
This UI contract is not automatically downloaded from backend metadata.
Backend API/import normalization still needs its own shared contract; frontend normalization is not a security or integrity boundary.
No historical codes or number ranges are migrated by this change.
Datetime, time, GUID, email, URL and phone semantics are shared by header and line editors. File/password workflows and remote uniqueness checks are separate concerns; do not infer them from a label.

Decimal validation supports `validation: { precision: 18, scale: 4, min: 0 }`. Precision is total storage digits; scale reserves fractional digits. Bounds are compared as decimal strings without rounding the input through JavaScript Number. Existing numeric min/max declarations remain supported; exact decimal bounds can be strings, for example max: '9007199254740993.12'.

## Record display identity

Record identity is separate from the database key. The shared resolver reads only declared fields; it does not infer identity from JSON order or field names.

Defaults come from an existing entity contract profile's optional identity metadata. A resource can declare this once for cards, document captions, FactBox headings and lookup display:

```ts
identity: { primaryField: 'code', secondaryField: 'description' }
```

No identity block is required on each page. Primary-field precedence is optional page identity override, dataSource.documentNoField, the isPrimary column, then resource metadata. Secondary-field precedence is optional page identity override, the primary column's subtitleField, then resource metadata. An empty-string override suppresses a field. Without a declared secondary field, the subtitle is omitted.

No. Series declares reusable resource defaults in entity-contract-profiles.ts and explicitly documents code/description in its page configuration. Purchase Requisition explicitly uses number/purpose. Page identity overrides remain optional for other pages. Singleton setup and worksheet titles keep their page context. New records without a display key use New plus the page title. Record captions update after a valid header change.

Lookup displayFormat and labelField/bindLabel remain explicit display overrides. Otherwise lookups use their displayField with the shared resource description. Lookup valueField still controls the stored key. Explicit FactBox bindings remain supported.

The document header keeps its configured page name above one record line: primary value plus secondary value, separated by an em dash. For example, No. Series above PR — Purchase Requisition. Identity values never replace the page name.

## Dependent lookup choices

Header fields and line columns share the same dependency contract. Each dependency reads from the current header or current line record. Declare the relationship, without writing search or clearing logic in the feature component:

```ts
lookup: {
  endpoint: '/bins',
  valueField: 'systemId',
  displayField: 'code',
  searchFields: ['code', 'description'],
  dependsOn: [{ field: 'locationId', valueFrom: 'locationId' }],
}
```

This example requires a backend resource supporting those fields. It does not add that resource to the backend. Optional lookup.filter supplies a fixed business filter. Dependencies are combined with fixed filters and search for all 20-record pages. Values are escaped; numeric and boolean dependencies can declare valueType. An unavailable controlling value disables the lookup and prevents a broad request.

An actual controlling-field edit clears dependent selected values and cached choices, including downstream dependencies. Initial record hydration does not clear saved selections. Header relationships work across configured sections. Cleared values accompany the controlling edit in the normal save lifecycle; line edits include related writable fields. Same-value edits do nothing. Superseded responses cannot repopulate choices from the old context. Header-to-line cross-record relationships are not part of this contract yet.

## Conditions and validation

requiredWhen and readonlyWhen use the same declarative shape on fields and line columns. hiddenWhen applies to form fields; grid-column visibility uses hidden or the shared Columns control:

```ts
requiredWhen: { field: 'status', values: ['Released'] },
readonlyWhen: { field: 'status', values: ['Open'], negate: true },
hiddenWhen: { field: 'kind', values: ['Service'] },
```

Hidden/readonly conditions affect the editor; backend authorization remains mandatory. Invalid form drafts remain visible with an associated error and are protected on close/navigation. Only valid changes produce save events.

A line lookup can explicitly read its header:

```ts
lookup: {
  endpoint: '/bins', valueField: 'systemId', displayField: 'code',
  dependsOn: [{ source: 'header', field: 'locationId', valueFrom: 'locationId' }],
}
```

Omit source for a same-record dependency. The example resource must actually exist in your backend. Dependent selections are cleared after a real controlling edit; header-dependent line writes wait for a successful header save.

## Verification without business records

Run `npm run verify:ui` for fixture tests, import/token guards and the production build. Fixtures provide their own records and API responses; they neither need a login nor write operational data. The 36-area review in platform-contract-coverage.json separates verified frontend contracts, backend-owned guarantees and manual visual/accessibility sign-off.

All page/resource/lookup declarations belong in the feature .config.ts file. Component TypeScript binds configs to DocumentPage and contains only optional domain hooks. Feature HTML hosts the shared engine. New page configurations still need their own resource/permission contract checked; passing platform fixtures does not certify arbitrary future configurations.

The Number Series API also normalizes its declared Starting No., Ending No. and Warning No. Code values on incoming create/update requests. This changes no existing stored rows and does not imply that every Code field is unique. Database keys and uniqueness constraints remain separate declarations.

## Shared deletion

Header records, checked list records, document lines and worksheet rows use the shared delete flow and existing ConfirmationService.confirmIntent dialog. No feature component needs a delete handler.

- dataSource.supportsDelete: false disables deletion and blocks direct command dispatch. Omitting it permits the operation subject to permissions, writableStates and a real backend DELETE route. Singleton addressing does not override this capability; singleton setup configs explicitly set supportsDelete: false.
- A configured toolbar override cannot re-enable an unsupported delete. permissions.delete may explicitly map a child operation to its backend permission (for example modify).
- Multi-selection confirms once with the target count. Successful responses remove only their rows. Failed or stale records stay visible with an error and are not automatically retried.
- Requests retain each record's systemRowVersion as If-Match and use the configured keyField and parent navigation. Up to four independent delete requests run at a time. Remaining requests stop if the company, user or workspace changes.
- Unsaved local lines can be removed without an API request. An absent selection never implicitly deletes the last line.
- Number Series uses the same shared flow with header and line DELETE routes. Issued-number history and existing references are enforced by the backend. Singleton setup pages retain supportsDelete: false.

Synthetic coverage: record-delete.service.spec.ts, delete-contract.spec.ts, and command-assembler capability tests. Backend DeleteCorsContractTest verifies preflight support while authentication remains enforced.


## Lookup loading and cache scope

The existing DynamicForm, DocumentLines and LookupSelect remain the shared editors. Opening a lookup reads a bounded page of 20 choices immediately. Only uncached typed searches wait for the 250 ms debounce; cached searches and opening have no artificial delay. Existing cursor declarations continue to work; offset is still the default.

The page host prepares selected captions before publishing rows or marking the entry ready. Standalone editors show an explicit pending caption when a selected ID needs resolving. Captions never change stored SystemIds or emit field edits. Lists and line editors reuse the shared selected-ID hydrator: at most 40 distinct IDs per request and six simultaneous requests per hydration. A failed caption displays an explicit local message; a denied lookup displays Restricted. Main-record/line request failures still use the existing blocking error flow. Search subscriptions cannot cancel caption hydration or have their choices replaced by late caption responses.

Lookup pages request count: false through DataSourceService, which sends $count=false. The backend returns meta.hasMore instead of computing an exact total. Normal list pages keep their existing total-count contract. The footer's loaded row count is rows.length and does not send an additional query.

CRUD invalidates its resource family, including nested children. Unrelated master caches survive note writes. Business policies that change additional resources must declare them on the existing data source, for example invalidates: ['/numberSeries']. Numbered record creation, domain commands, access configuration writes, explicit Refresh and company/user/workspace/token changes retain conservative invalidation. Cache entries remain bounded and selected lookup reads retain the existing 30-second freshness window; cross-user updates are not push notifications.

These changes do not make arbitrary contains searches index-backed. Large deployments must check their real search predicates, PostgreSQL indexes, network topology and concurrent load. The focused fixtures cover a 100,000-row PostgreSQL page and 100,000 synthetic UI options; they are not production throughput certification.


Complete shared API collections now declare meta.recordShape = 'complete', because their rows and detail reads use the same resource serializer. DataSourceService seeds bounded detail-cache entries from those rows, retaining the returned systemRowVersion and access context. An unchanged row in the still-open page reuses its version-matched snapshot beyond the ordinary HTTP TTL when all configured header fields are present. Null means no selection; a missing configured field requires a detail read. Summary/unmarked collections do not qualify. Invalidation and explicit Refresh require current server data. No per-page duplicate field declarations or extra partner component is needed.

Read onRequest notifications indicate that a server response is actually needed. Card/setup loading and child-row loading begin from that signal, not merely because a saved record or a line configuration exists. A cached empty child collection remains a valid completed result. Cached selected masters also supply line captions immediately; filter-dependent collection-only lookups retain their constrained read. An unchanged parent can reuse loaded child pages, including empty results, beyond the ordinary HTTP TTL. Scope changes and explicit invalidation revoke those snapshots.


## Shared save status after closing a window

RunModal can suspend a page with pending writes while its existing runtime, subscriptions and edit state remain owned by the shared host. The modal and backdrop are hidden, so the user can search or open another record. The shared ListGrid displays record-specific Saving changes, Changes saved, or an actionable error. This uses the existing CRUD handlers and queue; closing never submits a second write. A failed save reopens the same retained editor. Pending writes to the same record cannot open a duplicate editor.

The shared request deadline changes slow progress into an unknown-outcome message; it does not claim a rollback or automatically resend. Check status performs a bounded, read-only lookup. Matching server values are reported as an observation, not proof that an unacknowledged request finished. Browser/tab closure and route navigation retain the existing unsaved-navigation safeguards. Scope changes suppress old-company notices and responses.

Confirmed update responses synchronize an existing loaded row when active filter/search/sort fields remain unchanged. Inserts, deletes, partial or unavailable snapshots and query-affecting edits retain a server list query. An ordinary field update needs neither a collection reload nor a misleading Loading records indicator. Success notices disappear after a short display period; failed/unknown notices retain their recovery action. No per-feature page configuration or CRUD controller is added.
