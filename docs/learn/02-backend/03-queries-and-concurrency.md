# Query, write and handle concurrency

## Publish schema metadata only after commit — 13 November 2026

Cold PostgreSQL catalogue results read within a transaction are published to the
shared schema cache only after commit, and only if its generation has not
changed since the transaction began and the read occurred. Rollback discards
publication. A connection that has executed schema DDL bypasses shared reads
and publication until its outer transaction ends. Dirty state is isolated by
connection so completing another connection cannot clear the writer's guard.
DDL and transaction completion retain generation invalidation. This cache stores
catalogue metadata only; authorization and product records use their existing
separate mechanisms. No installed schema or API contract is changed.

## Return unchanged ordinary PATCH records without another SELECT

After the normal permission, locked-record, version and validation checks, a
plain unchanged PATCH returns the locked record directly. No save or final
refresh query is needed when there is no rules adapter or active beforeWrite,
determine or validate behavior. Actual writes and hook/rules paths retain
refresh to return database-generated and hook-modified values. Create and PUT
behavior is unchanged; stale row versions still fail before this optimization.

Related-card business-key probes and filter-panel choices explicitly use
count=false, so they do not count all matches just to inspect the returned rows.
Related cards still require exactly one of at most two returned matches. Filter
options keep their existing bounded size and component-local reuse.

## Remove repeated request queries and writes

Sanctum last-used timestamp tracking is disabled through its supported config,
removing a token UPDATE from authenticated reads. Token validity, expiry,
revocation and active-user checks remain. This application does not use that
timestamp to expire idle sessions.

Shared EntityInput no longer counts uniqueness matches for unchanged persisted
keys. It compares every composite-key member and scope column through model
storage casts. Creates and changed keys/scopes retain friendly duplicate checks
and database unique constraints. Read-only Users verification reduced unchanged
key COUNT queries from two to zero; changing Email still checked its unique key.

CompanyStorage combines template availability and readiness in one live query.
Repeated template probes within a request reuse the current connection/database
snapshot. Schema/transaction boundaries invalidate it. The live completeness
guard stays in place to prevent missing Company tables resolving to shared ones.

Existing infinite scroll requests count=false for ordinary lists, worksheets,
modal lists and document Lines. hasMore drives the existing continuation without
an exact total COUNT or an extra read after a full final batch. Cursor behavior
and old-response metadata fallback remain supported. No UI pagination feature,
new button or unbounded master-table read is introduced.

## Server authorization reuse

Login and API authorization now share PermissionService's server-owned effective
grant snapshot. Warm operation checks, Company membership, page rules and source
field rights reuse a dedicated Laravel file cache across PHP workers instead of
querying permission tables again. Its keys isolate database, user, Company and
workspace; the current single-server store has a 60-second lifetime.

Security-table writes observed by the backend retire the database's cache
generation, including shared Core atomic updates and bulk SQL. Dirty security
transactions bypass cached values. Commit/rollback retires the generation again;
cold transaction reads publish only after commit if their generation is current.
Last-login updates do not invalidate permissions. Out-of-process SQL changes are
bounded by the TTL; immediate administrative revocation outside the application
requires clearing this authorization store. Multi-node installations require a
shared cache store rather than node-local files.

This preserves operation, field, row and company/workspace enforcement. Browser
permissions do not authorize backend calls. Authentication/token and actual data
queries remain; this change does not claim that every API runs without SQL.
UI config, field autosave and lookup-fill behavior are unchanged.

## Shared API startup

Ordinary root Notes/Files URLs reuse registered collaboration transports instead
of generating nine routes for every source in both Company/workspace groups.
CRUD URLs and existing nested/singleton/alias/domain bindings remain. The path
source must resolve to an eligible backend registration; body/query values cannot
redirect owner access. Company/workspace, record and collaboration authorization
still run. A local three-process comparison reduced route count from 20,909 to
7,553, boot+health from 932–969 to 520–528 ms and peak memory from 128 to 78 MB.
This is startup evidence, not a server CRUD benchmark.

The UI builds query requests from its shared filter, sort and data-source config. The backend validates and executes them against published fields. Do not add a query-field map for each ordinary table.

## Remove ordinary read setup round trips

Company context reads combine the active company and active user/company
membership predicate in one query instead of fetching the company and issuing
a second membership `exists` call. Unauthenticated/inactive users, inactive
companies and missing/inactive memberships retain their rejection behavior.
This is existing server context validation, not a new frontend permission API.

CompanyStorage captures the prior search_path and sets its transaction-local
path in one PostgreSQL statement. The prior-value CTE is materialized before
set_config executes. PostgreSQL's returned active path seeds the existing
request metadata snapshot; subsequent metadata resolution does not issue a
redundant SHOW. Cleanup still restores the original server state after success,
exception, nested calls and callback session changes, disconnecting on restore
failure. No schema, posting/workflow or record-write behavior changes.

Runtime placement remains material: a local Windows artisan serve instance with
a remote database incurs connection setup and network round trips even for an
empty collection. PHP documents its built-in server as single-threaded and
does not support its multi-worker option on Windows. Production capacity must
be assessed with an appropriate concurrent web runtime and API/database placement,
not inferred from either this development server or a handful of query probes.

## One authorization boundary for ordinary CRUD

Generated ordinary CRUD routes use the existing EntityRuntime grant check rather
than generating a second permission middleware check for the same operation.
Previously both layers executed the same permission `exists` query. Users and PR
inherit this shared transport/runtime behavior; no page config opt-in is needed.
Runtime authorization also remains effective for direct service callers.
Business controllers retain generated permission middleware, and explicitly
configured middleware remains unchanged. Authentication, company/workspace
context, field rights and row-version checks retain their existing responsibilities.
Login's UI capability response does not replace server authorization.

## Reuse resolved metadata within one request

The backend reuses each source's resolved EntityDefinition and a table's physical
model-field mapping within the same active database connection/search path.
Collection model/resource instances do not rebuild the same interpretation for
every row. Source-declaration changes invalidate resolved definitions. Existing
DDL, search-path and transaction invalidation also clear this derived metadata;
request completion releases it. The existing cross-request catalogue cache stays
separate. Records and authorization decisions are not added to this cache.

Routing declarations are also reused while their source config remains identical;
changed declarations trigger the same validation again. This metadata reuse does
not cache database rows or authorize requests.

Code-only controller discovery now loads through Laravel's `config/api_sources.php`.
`config:cache` can retain that discovery instead of bootstrap rebuilding it on
every cached boot. The existing registry still accepts package sources after
loading the core declarations, without restoring stale provider registrations.
Older config caches without this base declaration use the existing discovery
fallback. Rebuild config/route caches after deploying source changes. Uncached
development still discovers controllers, and the large generated route collection
remains a startup cost; these corrections do not establish live ERP latency.

Bounded collection reads delegate directly to the existing paginator instead of
resolving/authorizing the query profile twice. `$count=false` retains bounded
continuation without an aggregate count. Company applicability choices now use
that same query contract: identity filters, typed search, paging and field rights
run over the existing active-company/membership restrictions. The DTO remains
`systemId`, `code`, `name`; it does not become a complete Company record cache.

## Header numbering through the same CRUD POST

The existing backend `numbering` declaration names its Number and series fields.
A code-based series uses current `no_series.code`, `no_series_lines.series_code`,
`increment_by_no` and `open`; it does not reuse a CRUD UUID as a relationship.
PR declares `number`/`noSeriesCode` and accepts manual No. without a series, or
allocates from the selected series. Manual No. with a selected series requires
that series's Manual Nos. permission. Allocation locks the series/line and rolls
back if Header creation fails. Counters, dates and exhausted-line state are
server-owned; used series lines cannot change their sequence definition or be
deleted. Normal series lines are supported; Sequence mode is rejected explicitly.

This is one shared behavior, not a PR-specific save route or allocator. A source
may additionally declare an existing company setup model/field for its default
series. No PR default setup field exists in the current schema, so none is
invented; PR selects a series directly. Legacy UUID-series paths remain
compatibility code, not the current No. Series UI contract.

## Lookup display and fill stay in UI configuration

User assignments expose their stored permissionSetCode. The UI's existing lookup
selects /permissionSets by code and fill maps its name to permissionSetName.
No virtual permissionSetName field, schemaFrom/readRelation binding or extra
projection permission mechanism is added to this CRUD API for UI display.
The original userName update restriction predates this correction and remains.
Related source reads still use their existing API authorization and field rights.

## Query the published fields

```http
GET /api/v1/companies/{companyId}/samples?$filter=isActive eq true&$orderby=code asc&$top=25&$skip=0
```

The example is shown unescaped for readability; the HTTP client encodes query parameters. Public field names must exist in the source contract. API source options may exclude sensitive or unsuitable query fields. A UI column does not automatically authorize a database field.

## Sorting and paging

```typescript
dataSource: {
  endpoint: '/samples',
  keyField: 'systemId',
  pageSize: 25,
}
```

Sorting configuration is optional. Without UI sort, ordinary lists use
`system_created_at DESC, system_id DESC`. Ledger/history sources with an
authoritative entryNo sequence use `entry_no DESC, system_id DESC`, resolved by
Core from the existing cursor contract or read-only scoped unique key. Merely
naming a column entryNo does not make a writable table a history source.

Set `defaultSort: 'code asc'` only when the page intentionally overrides that
order. Authorized UI sort wins; Core appends systemId DESC for stable ties unless
systemId was explicitly sorted. ApiSource needs no query.orderBy declaration.
Existing PR number DESC and lineNo ASC UI overrides remain unchanged.

History cursors use descending sequence/UUID and a parameterized tuple `<`
continuation. Tokens bind source, scoped query, user, path, database and page size.
Old ascending tokens must restart at cursor=start. Cursor plus arbitrary UI sort
remains a validation error; use offset paging for a custom order. An unreadable
automatic sort field returns 403, rather than silently selecting another field;
an authorized explicit sort on other fields remains usable.

The UI page size becomes the requested top/count. Backend validation and defensive limits protect the API independently; do not hardcode a new per-table limit merely to match one page. Cursor paging is an explicit capability and must be supported on both sides before selecting it.

The response's `meta.total` is pagination metadata. It is not a delay timer or visual row count. The hydration flow must terminate on an empty returned page even if metadata disagrees. Placeholder visual rows are not saved records and must not be counted as API data.

## Create and patch

POST creates a record using ordinary writable fields. PATCH updates an existing record. System audit and scope values come from server context. Omit create-only secrets or immutable fields from updates through the declared field policy; do not let client config become the security boundary.

```http
PATCH /api/v1/companies/{companyId}/samples/{systemId}
Content-Type: application/json
If-Match: "{the-server-returned-version}"

{"description":"Revised description"}
```

Treat the returned ETag/version as opaque. Keep the exact server value. Source-specific compatibility contracts may make concurrency optional; do not weaken the shared default to accommodate an unrelated module.

## A stale record

When another writer changes a record first, a precondition conflict must be shown. Refresh and reconcile changes rather than overwriting another user's work. The shared UI owns this behavior; avoid page-level unconditional retries.

## A timeout

A timeout does not prove the write failed before reaching the server. Do not blindly repeat POST or a posting action. Check the record or use the operation's supported reconciliation/idempotency contract. Keep the error visible and preserve the user's draft where possible.

## Restricted fields in queries

### Schema defaults and explicit exceptions (checkpoint 3/7)

An ordinary readable physical field from an explicitly published API becomes a
filter/sort candidate automatically. Add the PostgreSQL column; do not repeat its
type/column mapping in a PHP query.fields list. Core excludes private, reserved,
virtual and generated fields from unrestricted defaults. Existing source exposure
policies remain the authority; Core cannot infer that an arbitrary new column is
private merely from its name.

Checkpoint 3B removes the backend-selected search default. UI config selects the
fields and sends existing filter predicates. Quick Search sends an OR group;
Advanced Search combines AND/OR, typed comparisons and dates. No PHP search-field
declaration is needed, and Core does not search all text columns. Cursor keys,
limits, indexes, aliases and company/parent scopes remain.

A page using Customers can send this URL-encoded `filter` JSON with `sort=name`:

```json
{"or":[{"field":"name","op":"contains","value":"ABC"},{"field":"email","op":"contains","value":"ABC"}]}
```

Another page for that API can choose other authorized fields. The `$filter`
equivalent is `contains(name,'ABC') or contains(email,'ABC')`. Backend validates
physical type, exposure and effective rights; UI field selection grants no access.

Bare `search`/`$search` now return 422, including empty values. All backend search
field arrays, their aliases, service delegations and implicit defaults are removed.
ApiSource does not accept search-field configuration. Auth metadata no longer
selects search fields. Existing clients must send explicit `filter`/`$filter`.

Frontend ListPage must separate queryable-field capability handling from UI-owned
search flags; its fallback currently expects metadata that no longer exists.
Lookups use configured fields/display fields instead of inferring search fields
from backend metadata. ListFilterStateService and lookup
query construction already build explicit predicates and should remain the execution
path. This is required coordinated UI migration; no Angular code is changed here.
External service callers must also remove the obsolete search argument from the
17 changed query methods; business filters retain their names and relative order.

Existing query.fields is a deliberate fixed allowlist when needed. queryExclude
and queryInclude remain optional overrides. Checkpoint 3 removed 63 repeated
allowed-field arrays: 22 were completely redundant and 41 were replaced with
negative exclusions preserving their old query surface. The business rationale
for those legacy exclusions remains unverified; do not copy them to a new table.

Queries bind the actual route ApiSource. Different views of one table keep their
own query and field policies. Unbound legacy profile calls reject ambiguity, and
a source/profile mismatch fails instead of selecting the first registration.
An alias keeps its canonical target's field identity and SQL type; private aliases
cannot reopen hidden columns. This uses the existing Registry and ListQuery.

Focused dedicated-PostgreSQL tests cover SDK publication, adding/querying a new
column, protected fields, company/parent collections, cursors and restricted aliases.
They do not establish whole-module or production-load acceptance. No Angular
components or page configs were changed for this backend checkpoint.

Core authorizes filter identifiers, sort fields and cursors against their exact
published source and canonical field identity. API aliases retain that identity;
text inside a filter value is not a field name. An unreadable field cannot be
filtered or sorted. An unrelated restricted field does not disable authorized
predicates. Querying an unreadable selected field is rejected before record SQL.

Domain date/filter aliases declare their field using the existing
ApiSource `http.filters` options. Unknown custom aliases fail closed under
restrictions. These checks complement record-output masking and do not grant
record or company access.

Checkpoint 2 has focused database-free verification only; it does not establish
full runtime compatibility for every module.

## Scope remains mandatory

The URL company and workspace are authorized contexts. `companyColumn: null` declares shared storage; it does not bypass company membership or administrative permissions. Never accept a client-supplied company ID as authority to access another company's data.
