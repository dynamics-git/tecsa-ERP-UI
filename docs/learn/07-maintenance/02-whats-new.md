# What's new in developer documentation

## 6 November 2026: document lines before lookup captions

Removed duplicate page-level waiting for line lookup names. The existing shared
line component resolves selected captions in the background after real rows are
shown; it preserves edits during completion. A write-only password field no longer
forces a second header read of an unchanged complete Users list record. Ordinary
CRUD also combines its one table's schema metadata reads into one PostgreSQL
round trip per request, without a persistent cache or database changes. See
[the field contract](/documentation/core/field-contract-details).

## 6 November 2026: permission snapshot and local list loading

Removed `auth/context` and its background refresh lifecycle. Login includes
selected-Company permissions; explicit Company selection/switching uses the
existing Company selection response. Startup, focus, navigation and permission
row saves do not trigger extra session reads. Session discovery reads declared capabilities
without introspecting every business table. Explicit catalogue reads use one
bound PostgreSQL/Laravel query per metadata kind instead of hundreds of UNION
arms. Record UUIDs, table definitions, CRUD routes and backend authorization remain
unchanged. See [permission administration](/documentation/modules/permission-administration).

## 5 November 2026: scoped presentation token cleanup

Moved repeated parent-menu, shared command and shared form presentation values
into component/typography tokens without changing the palette or existing
spacing/weights. Increased only parent-menu leading icons from 13px to 18px;
dropdown chevrons remain 13px. Focus/info/selection colors now reference the
existing identical brand token. No page config, API or editing behavior changed.

## 5 November 2026: checkbox activation safety

Fixed shared header/form labels toggling booleans when their caption or empty
field area was clicked, which could autosave an unintended change. Only direct
checkbox activation edits the value; native keyboard behavior is retained.
Added rendered component regression coverage for header, line and worksheet
click boundaries, disabled/readonly values and ordinary text labels. See
[the field contract](/documentation/core/field-contract-details).

## 5 November 2026: individual API source controllers restored

Each table now has its own thin controller with ApiSource and inherited Core
CRUD. Removed the consolidated table controller and its publisher. Existing API
contracts/routes are preserved; no schema, posting/costing or UI runtime change
was needed. Follow Individual Migration -> Model -> Individual Controller +
ApiSource -> Shared EntityController for future table work.

## 5 November 2026: readable tables and normal CRUD correction

Documented individually readable backend table migrations, shared draft Purchase
and Sales Header–Line APIs, and PR's single typed number reference. Native binary,
time and own-object record-reference types reuse existing schema-backed Core.
Existing page configurations and workflow buttons are not yet proof of the
corrected API contract; normal page alignment precedes later business logic.
No page renderer, shared component, menu or design token changed in this update.

## 5 November 2026: local Object Explorer and simpler page identity

Laravel generates private searchable offline HTML from ObjectRegistry/ApiSource
and actual Angular source, with VS Code/GitHub links and related files. Existing
pages without numeric IDs remain visible. Config now uses only optional
`objectId`; PR's duplicated object name/type/table/codeunit declarations were
removed. Cross-repository source/ID checks do not change pageId, title, routes,
permissions or Header–Line behavior. See
[Object Architecture](/documentation/backend/object-architecture).

## 5 November 2026: Phase 2 object foundation and PR integration

Added optional stable Page Object identity to existing Config-based pages and
the existing page registry. PR resolves by Object ID to its current component;
its document-number/type Header–Line binding is unchanged. Backend Table,
Codeunit, Query, Report dataset, Enum and Permission identities reuse existing
Core. See [object architecture](/documentation/backend/object-architecture).
The page-registration test now recognizes existing standalone worksheets such
as Companies, alongside related worksheets. No renderer, design-token or
installed schema change is involved.

## 5 November 2026: Company login and archive JSON discovery

Corrected backend schema discovery for existing PostgreSQL JSON/JSONB archive
fields, which previously caused Company session context to fail after successful
authentication. Shared casts preserve structured JSON values; scalar query
filter/sort contracts remain separate. No new schema, API source or UI editor
was added. Login and Company context were verified through the development API.

## 3 November 2026: Finance and General Ledger Part 4 checkpoint

Published the [Finance Part 4 developer/consultant guide](/documentation/modules/finance-part4), identifying existing General Ledger, VAT, Receivables, Payables and Bank Reconciliation tables, plus a bank history extension migration. The backend is **not migrated or accepted**. No duplicate accounting ledger or posting engine was added.

## 3 November 2026: Part 3 Inventory & Warehouse schema/API reference

Added a [developer and consultant guide](/documentation/modules/inventory-warehouse-part3) for Warehouse Receipt/Shipment, Bin Content, Inventory Reservation Entry, and Tracking Specification tables. The backend work remains **unmigrated/unverified**; no new warehouse posting flow or completed reservation/tracking behavior is claimed. Existing bin/pick history and item/value ledgers remain authoritative.

## 3 November 2026: Part 2 Sales schema/API reference

Added the [Sales Part 2 guide](/documentation/modules/sales-part2-database) describing new draft Sales documents, item-charge tables, extended posted document fields, and API-source declarations. This is a schema inventory, not accepted Sales posting integration.

## 2 November 2026: response-driven ERP request lifetime

Removed default 8/15-second request limits and isolated hardcoded hydration/filter/
metadata limits. Existing timeout overrides remain optional. Pending saves retain
their real state instead of becoming unknown because a timer elapsed; no write
retry was introduced. Company Copy uses the shared prompt/progress/Core worksheet
workflow and selected source identity. Import/token lint and compilation are
checked separately from regression suites; no additional test suite was run for
this user-requested review. See [commands and RunModal](/documentation/core/commands-and-runmodal).

Import/token lint and the development build passed. Production compilation reached
the initial-bundle guard but exceeds its unchanged 1.2 MB ceiling by 6.63 kB; this
is an unresolved bundle-size blocker, not a TypeScript error or a passed release
build. No budget was raised to conceal it. The configured PostgreSQL statement,
lock and idle-transaction timeouts were checked and all are disabled (`0`).

## 2 November 2026: Company-specific physical storage

The backend branch introduces physical Company schemas within existing workspace
databases, transactional provisioning, scoped HTTP/console/queue execution and
schema-based copy/delete. UI/API contracts remain unchanged. Rollout is a controlled
database cutover with verified backups and acceptance, not a frontend configuration
change. See [Companies](/documentation/modules/companies) for migration/rollback.

## 2 November 2026: missing attachment files during company copy

Full company copy skips attachments whose source file is already missing. The API
returns warnings and the completion dialog reports the skipped count. Valid files
and records still copy; no broken destination attachment is created. Source cleanup
is separate. Other storage failures still roll back the operation.
See [Companies](/documentation/modules/companies).

## 2 November 2026: full copy with historical collaboration owners

Reproduced a full-copy 409 caused by existing Notes whose parent had already been
physically deleted. Full copy now preserves those Notes/files and historical owner
IDs without recreating parent records. Live-owner mappings, other-company isolation,
independent files and rollback on storage-copy failures remain enforced. Missing
files now follow the warning behavior above. Source data is not
deleted or repaired automatically. The copy prompt explicitly names its source.
See [Companies](/documentation/modules/companies).

## 2 November 2026: restored-session access and disabled commands

Authenticated route entry now initializes the existing permission refresh service.
Previously a restored session could keep older operation flags until a lazy
consumer such as the company switcher instantiated AuthService. No new refresh
engine, per-page request or SUPER bypass was added. Shared shell/document/line
toolbar commands now dim visibly when disabled and use a not-allowed cursor.
Focused checks cover restored-session refresh, allowed and denied server flags,
and an open worksheet receiving updated access. See
[command access and layout](/documentation/core/commands-and-runmodal).

## 2 November 2026: shared command prompt and progress presentation

Compact shared prompts stack their fields instead of inheriting three document
columns. Dialog spacing, typography and surfaces reuse existing tokens. Copy
company uses a short description and readable choices, without an explanatory
callout. Its shared spinner starts only after submission and cannot be dismissed
while pending. Existing CRUD/delete loading remains unchanged. See
[command dialogs](/documentation/core/commands-and-runmodal).

## 2 November 2026: Companies toolbar correction

Removed the duplicate, unhandled New company command and custom Delete company
handler. Companies uses Core New/Delete, including shared delete confirmation and
loading state. Copy is its only custom business command. Removed the extra page
loader/workspace component and bespoke stylesheet; the Companies HTML binds
ListPage directly, following PR, with shared feedback dialogs and loader.
Corrected DataSourceService resource normalization: a global Companies record URL
must not be stripped as a company-scoped resource prefix. That error could report
an already-committed write as failed during cache invalidation.
See [Companies](/documentation/modules/companies).

## 2 November 2026: shared record acceptance checkpoint 6/7

Corrected shared field-write authorization to accept an already-resolved private
collaboration definition, avoiding public-registry 404s without publishing private
tables or bypassing rights. PR header/line, Users, SDK and nested-history checks
cover Notes/Files, audit, stale writes, permissions and company isolation. Separate
loopback HTTP checks use two disposable workspaces with matching UUIDs. No Angular
source or feature config changed. See
[record-feature contracts](/documentation/core/factbox-notes-and-files).

Use this page to record reviewed development changes and link readers to the matching guide. Do not treat a roadmap item as a completed feature.

## 2 November 2026: Stage 5 schema-column acceptance

Baseline b53ec7df reverts the rejected bulk field-policy relocation. Disposable
PostgreSQL tests first prove automatic SDK and existing PR header/line column
handling through metadata, HTTP CRUD/query, validation and persistence. Existing
Core and field declarations are unchanged. Targeted command physical constraints
then reuse existing schema rules while business/financial behavior remains.
See [table/API contract](/documentation/backend/table-and-api) and
[business exceptions](/documentation/backend/business-rules-and-exceptions).
The original Stage 5 alignment entry below is historical and reverted.

## 2 November 2026: reverted domain input/write-policy checkpoint 5/7

Implementation 96e9c2f3 moved ordinary field prohibitions into ApiSource. It was
rejected and reverted by b53ec7df. Its former completion claims do not describe the
current backend and must not be followed as an SDK authoring pattern.
## 2 November 2026: shared write lifecycle checkpoint 4/7

Corrected shared parent/owned-child resolution to use actual PostgreSQL FK pairs,
including composite business keys. Flat aliases now resolve parent scope for
writes as well as reads. Trusted scope participates in candidate validation;
domain validators cannot reopen source-prohibited fields. Record UUID identity,
existing routes, page configs, domain services and financial processing remain.
See [table/API write flow](/documentation/backend/table-and-api) and
[business relationships](/documentation/backend/business-relationships).
Acceptance evidence and remaining baseline test callers are recorded in the
backend Stage 4 report; this is not whole-ERP module acceptance.
## 2 November 2026: shared Core sorting correction

UI sorting is optional. Core now orders ordinary lists by creation descending and
authoritative history sequences by entryNo descending, both with systemId DESC
ties. Authorized UI sort overrides this; no per-source orderBy declaration is
needed. Descending cursors seek with `<` and reject changed context; old ascending
tokens restart. Service processing orders, query exposure/scopes and financial
algorithms remain unchanged. Existing PR UI sort overrides remain explicit.
This is a focused backend correction, not whole-ERP acceptance. See
[query contract and cursor limits](/documentation/backend/queries-and-concurrency).

## 2 November 2026: strict UI-selected query correction 3B

Removed backend-selected ordinary search defaults. Quick/Advanced Search uses
existing field predicates selected by UI config, with server type/permission/scope
validation. Removed all 100 text-search field arrays, aliases, metadata, restoration
branches and 17 service search arguments/delegations; 17 controller callers are
updated. Bare text-search parameters return 422. This replaces the earlier rejected
compatibility implementation. UI metadata consumers and external text-search/service
callers require coordinated migration to explicit filters. The 41 exclusions remain unverified
compatibility restrictions, not assumed security requirements. No Angular code
changes, new engine, production tables or financial algorithms. See
[query contract and limitations](/documentation/backend/queries-and-concurrency).

## 2 November 2026: schema-driven queries checkpoint 3/7

Readable physical fields now use shared schema-driven filter/sort defaults;
reserved, hidden, virtual and generated fields remain protected. Removed repeated
query-field arrays while preserving legacy exclusions and search sets. Query
profiles bind their exact source and reject ambiguity. Corrected the three PO
comment-source callers and domain date-filter binding validation. Focused tests
exercise a disposable SDK table and restricted/scoped queries in the dedicated
test database. No Angular component/config changes or whole-module acceptance.
See [queries and concurrency](/documentation/backend/queries-and-concurrency).
Checkpoint 4 requires independent review.

## 2 November 2026: field permission enforcement checkpoint 2/7

Record resources now enforce their own exact source, including nested collections.
Write input sources are separate from command result sources; command aliases and
nested edits bind actual fields. Notes/Attachments retain independent DTO contracts.
Search permits readable fields without being blocked by unrelated hidden fields;
filter/sort aliases preserve canonical authorization. Unprovable projections and
report lineage fail closed with documented limits. No UI feature configs changed.
Database-free boundary checks passed; full module/live persistence acceptance was
not run. See [business exceptions](/documentation/backend/business-rules-and-exceptions)
and [queries](/documentation/backend/queries-and-concurrency). Independent review
is required before checkpoint 3.

## 1 November 2026: API source binding checkpoint 1/7

Custom record routes now bind their exact source, including posted headers,
lines, assignments and ledger views. Generated routes retain their existing
bindings. Missing/unknown source bindings fail closed; non-record exceptions are
explicitly documented. Customer and vendor ledger-application responses use their
independent route sources. Model field validation uses PostgreSQL metadata rather
than the first matching API view. This checkpoint does not complete nested field
permissions, business-key parent support or the full partner SDK. See
[business exceptions](/documentation/backend/business-rules-and-exceptions).

## 1 November 2026: backend structural cleanup implementation

Schema-backed models and shared resource/input helpers remove repeated physical
field declarations. The implementation removes all 54 original custom Request
classes and 45 response-only Resource wrappers. Existing domain services retain
operation-specific checks; shared Core owns physical validation and mapping.
Corrected remaining journal/document input selections and model assignments so
schema-mapped values survive ordinary saves; calculated values retain precedence.
Date/time output uses the shared UTC JSON formatter; timestamp representation
compatibility has not yet been exercised. Existing Users and global Companies CRUD use the shared
runtime; services retain credential/visibility rules. Public hook signatures,
domain commands and posted-history protections remain. This does not add Company
copy/delete, resize columns or migrate UI pages. Runtime tests are explicitly
deferred; implementation is not regression acceptance. See
[table/API authoring](/documentation/backend/table-and-api) and
[business exceptions](/documentation/backend/business-rules-and-exceptions).

## 1 November 2026: company switcher drawer

Replaced the header's generic company prompt with a dedicated searchable Company Switcher inside the existing drawer host. Preserved authorized-company loading, pending-edit guards, session switching and workspace refresh. Added current/selected indicators, fixed search/footer, loading/error/retry states and in-flight dismissal protection. See [commands and RunModal](/documentation/core/commands-and-runmodal).

## 1 November 2026: list toolbar dismissal

Corrected shared View/Export menus and Columns/Save view panels to dismiss on an outside click or tap while retaining inside interactions. Escape also closes native toolbar menus. Existing filter-side-panel behavior is preserved. See [lists and personalization](/documentation/core/lists-and-personalization).

Aligned the shell profile dropdown with the existing global-search overlay layer so RunModal does not cover it. Added pointer-based outside dismissal while retaining click/keyboard behavior. See [commands and RunModal](/documentation/core/commands-and-runmodal).

## 1 November 2026: document text hierarchy

Kept the line grid aligned with the document body after reviewing an inset scrollbar treatment. The added gap created an unnecessary strip and was removed; independent document/grid scrolling remains unchanged.

Extended the same hierarchy to list pages: 20px main titles, quieter context/toolbar text, medium column headers, brand-coloured record links and restrained neutral badges. Main document titles now match the FactBox title size. Row content, page configuration and record behavior are unchanged.

Refined shared foreground roles after the initial readability change: primary titles/data remain dark; labels, inactive tabs and metadata use distinct slate roles. Kept 14px body/13px labels, reduced ordinary form/grid value weight, retained section/grand-total emphasis, and made FactBox metric values more prominent. The documentation portal already belongs to `ui-corefixed`; no duplicate documentation merge is required.

## 31 October 2026: learning guide foundation

- Added the separate Documentation reading surface linked beside Company.
- Added backend migration/model/API tutorials, business-key relationships and query/concurrency guidance.
- Added UI page-type guides, autosave/validation, lookups, RunModal, calculations, FactBox and grid guidance.
- Added Users, PR and Page Permissions examples included from source.
- Added config reference generated from the current platform declarations.
- Added module guides for permission administration and PR, plus the maintenance workflow.

## Existing work captured by this guide

### 31 October 2026: shared readability review

Raised shared body text to 14px and labels to 13px, strengthened secondary text tokens, and clarified the shared FactBox header/section hierarchy. List primary values and line column labels follow those shared roles. Captions remain 12px for supporting metadata. This styling change does not alter page config, permission logic or API behavior.

The baseline permission work was committed before this documentation feature: frontend `ae0b81e`, backend `d6cc618`. Those revisions align permission APIs and business-key relationships with shared CRUD and UI autosave.

This entry records the documentation starting point, not a claim that every business module or a full SDK generator has been completed. Browser verification and module acceptance should be reported against the specific change being reviewed.

## Add the next change

After completing a module or a core change, add a dated entry with its behavior, affected guide and any migration/compatibility requirement. Keep detailed developer instructions in the relevant article rather than growing this page into a second architecture manual.
