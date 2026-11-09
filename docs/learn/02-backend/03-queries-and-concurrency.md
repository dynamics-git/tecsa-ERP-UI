# Query, write and handle concurrency

The UI builds query requests from its shared filter, sort and data-source config. The backend validates and executes them against published fields. Do not add a query-field map for each ordinary table.

## Request source processing — 9 November 2026

The backend resolves the trusted route's named ApiSource rather than rebuilding
every API routing definition during each list/query/field-policy check. Safe reads
do not resolve write sources. Source binding and Company/permission validation
remain enforced. The final generic EntityResource filters once; custom response
Resources retain their final guard after projections. No UI capability/context
request, new endpoint or cross-request permission cache is introduced.

## Query the published fields

### Local API timing — 10 November 2026

One list HTTP call can contain several backend SQL statements. PostgreSQL
schema-derived fields, Company storage and permission checks remain backend
responsibilities. The backend now sends bound statements without a separate
named-prepare exchange, combines the three storage checks into one SELECT and
keeps membership inside each grant query. No UI API contract/config change is
required and no context/capability request is added.

A read-only Users kernel diagnostic returned 23 records with 21 queries in
3.20 seconds, versus 26 queries in 9.86 seconds before these corrections. It
supplied the actor in memory; this is not browser/bearer-token acceptance.
The API ran locally against remote PostgreSQL. Remaining SQL network trips and
local PHP startup/queuing still need attention; this is not a fast-UI sign-off.

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
