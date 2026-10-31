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

## Scope remains mandatory

The URL company and workspace are authorized contexts. `companyColumn: null` declares shared storage; it does not bypass company membership or administrative permissions. Never accept a client-supplied company ID as authority to access another company's data.
