# Query, write and handle concurrency

The UI builds query requests from its shared filter, sort and data-source config. The backend validates and executes them against published fields. Do not add a query-field map for each ordinary table.

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
  defaultSort: 'code asc',
  pageSize: 25,
}
```

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

Existing `search`/`$search` callers retain 100 documented `query.legacySearch`
contracts. Older `query.search` is a deprecated SDK declaration alias. These are
compatibility, not new-page requirements. Seventeen service search blocks now
delegate to ListQuery's single compatibility implementation. New sources without
a legacy contract must send filters; bare text-search returns 422 instead of
guessing fields. Frontend ListPage/EntityContractService metadata fallbacks still
consume legacy search metadata; migrating these callers is separate Angular work.
No Angular code changed in this checkpoint.

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
filtered or sorted. Legacy text-only search uses readable compatibility fields, so hiding
an unrelated field does not disable legitimate search. If all configured search
fields are hidden, search returns 403.

Existing domain search passes through the same authorization boundary before its
service runs. Domain date/filter aliases declare their field using the existing
ApiSource `http.filters` options. Unknown custom aliases and opaque SQL ordering
fail closed under restrictions; Core does not guess their dependency by spelling.
An unreadable historical default basic order is removed. These checks complement
record-output masking and do not grant record or company access.

Checkpoint 2 has focused database-free verification only; it does not establish
full runtime compatibility for every module.

## Scope remains mandatory

The URL company and workspace are authorized contexts. `companyColumn: null` declares shared storage; it does not bypass company membership or administrative permissions. Never accept a client-supplied company ID as authority to access another company's data.
