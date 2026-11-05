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

TecSA core IDs use 1–9999999; future extension IDs start at 10000000. Identities and names
are unique per type. Registration is trusted code, not an install/permission
operation. No SDK installer, range allocator or new security engine is supplied.

## Page Objects keep Config + TypeScript + shared components

Only optional `objectId` is added to the existing `ListPageConfig`:

```ts
pageId: 'purchase-requisition',
pageType: 'document',
title: 'Purchase Requisition',
objectId: 10000,
```

This is the actual PR example. The page's `pageId: 'purchase-requisition'`,
`pageType: 'document'`, menu, HeaderConfig, LineConfig, FactBox and thin
`PurchaseRequisitionPage` component remain unchanged. `page-registry.ts` validates
optional IDs and `resolvePageObject(10000)` finds the same discovered
module as routes and RunModal. It is not another page catalog/renderer.

Do not repeat objectType, objectName, sourceTable or codeunit in Config. The
backend ObjectRegistry/ApiSource and actual constructor/source relationships
provide these links in the local developer Explorer. Angular does not load a
second object/file registry or change runtime API/permission contracts.

## Open the local Developer Object Explorer

In the Laravel repository, run:

```powershell
php artisan objects:explore --ui="C:\Git-Project\tecsa-ERP-UI" --open
```

The local/testing-only command generates private offline HTML at
`storage/app/developer/object-explorer/index.html`. Search/filter all seven object
types and existing pages without numeric IDs. Click a name for VS Code: Page
opens Config, Table its model and Codeunit the business service. Related buttons
show real Config, TypeScript, template, ApiSource controller, models and services,
with GitHub fallback links. It adds no web endpoint or database connection.

The source exporter reuses feature-folder discovery and TypeScript syntax
inspection without executing configs. `objects:explore --ui=... --check` checks
numeric IDs, page modes and root ApiSource bindings across both repositories.
Mismatched, missing or duplicate assigned IDs stop generation. Existing legacy
endpoints without matching backend sources appear as notes, not guessed links.

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
