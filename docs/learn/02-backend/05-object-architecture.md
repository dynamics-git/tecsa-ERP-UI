# Use TecSA Object identities with existing Core

Phase 2 adds stable Object Type + Object ID + Object Name metadata over existing
implementations. Record identity remains the database `system_id` / API
`systemId`; an Object ID is never a header key, line number or permission grant.

## Backend objects

The backend `ObjectDefinition` attribute identifies existing Eloquent Table
models, ApiSource-bound Pages, Laravel Codeunit services, backed Enums and
source-bound Permission Objects. Query Objects refer to existing service query
methods and schema-derived ApiSource profiles. Report Objects refer to a Query
dataset contract; rendering/export and report execution are future work.

PostgreSQL still owns columns, data types, keys and relationships.
`SchemaBackedFields` and `PostgresTableSchema` provide physical metadata within
the current Company context. Table objects do not introduce another field list
or publish APIs. Existing `EntityRegistry`, `ApiSource`, generic CRUD, business
services and `PermissionService` remain authoritative.

Core IDs use 1–49999; future extension IDs start at 50000. Identities and names
are unique per type. Registration is trusted code, not an install/permission
operation. No SDK installer, range allocator or new security engine is supplied.

## Page Objects keep Config + TypeScript + shared components

Optional `object` metadata belongs to the existing `ListPageConfig`:

```ts
object: {
  objectType: 'page', objectId: 10000, objectName: 'Purchase Requisition',
  sourceTable: {objectType: 'table', objectId: 10000, objectName: 'Purchase Requisition'},
  codeunit: {objectType: 'codeunit', objectId: 10000, objectName: 'Purchase Requisition Management'},
}
```

This is the actual PR example. The page's `pageId: 'purchase-requisition'`,
`pageType: 'document'`, menu, HeaderConfig, LineConfig, FactBox and thin
`PurchaseRequisitionPage` component remain unchanged. `page-registry.ts` validates
optional identities and `resolvePageObject(10000)` finds the same discovered
module as routes and RunModal. It is not another page catalog/renderer.

List, Card, Document and Worksheet retain their shared runtime behavior; Setup
continues to work. Existing pages without object metadata remain supported.
Standalone worksheets such as Companies edit their own collection. Related
worksheets retain their explicit parent binding. No layout/design token changed.

## PR integration proof

PR Table 10000 and Line Table 10001 derive fields from SQL. Codeunit 10000 is the
existing `PurchaseRequisitionService`; Query 10000 binds its existing `query`
method; Report 10000 names that dataset; Permission 10000 delegates existing PR
resource and route requirements. Enum 1 identifies the existing `DocumentType`.

The actual shared Header–Line runtime still binds header `number` to line
`documentNumber` and copies `documentType` through `parentFieldMap`. Both records
keep `keyField: 'systemId'`. Backend line numbering and validation remain in the
existing service. Object IDs are not inserted into record payloads or filters.

Focused backend tests use a dedicated localhost test database and existing PR
HTTP/service operations. Angular tests verify lookup, collisions, page modes and
Header–Line behavior. No installed database schema or posting/costing logic is
changed. Assigning IDs to other modules and SDK/report authoring remain later work.
