# What's new in developer documentation

## 13 November 2026: remove remaining card/filter counts and unchanged PATCH rereads

Related-card business-key probes retain top=2 and reject zero/multiple matches,
but no longer request an exact total count. Filter-panel choices also disable
count without changing their bounded options or local reuse. Existing infinite
scroll and configuration remain unchanged.

Backend shared PATCH skips its final refresh only for unchanged plain records
without write-stage behaviors/rules. Actual saves and hook paths retain refreshed
database values. Focused coverage checks no-op persistence/read suppression,
real-write refresh, hook refresh and stale-version rejection.

Backend commit `a4307628` deployed successfully through the existing IIS workflow;
health returned 200 and anonymous `/auth/me` returned 401 afterward. UI changes
remain local for review. Production build, focused related-card/filter/navigation
checks, documentation checks and lint passed. These checks do not establish full
authenticated browser latency.

## 13 November 2026: remove repeated CRUD request work

Backend token-usage timestamp writes are disabled through Sanctum config.
Shared uniqueness validation skips unchanged stored keys/scopes, preserving
create/changed-key checks and database constraints. Read-only Users checks
confirmed zero unchanged-key COUNT queries versus two before, and one check
when Email changed. Company storage setup combines two queries into one while
retaining live completeness guards; repeated template checks within one request
reuse a connection/database snapshot.

The existing infinite scroll remains. Lists, worksheets, modal lists and Lines
request count=false and honor hasMore without introducing buttons or numbered
pagination. A full final batch no longer causes an extra empty request. Backend
total-count compatibility remains available to clients that request it.

Backend commit `218fa7df` deployed successfully through the Windows IIS workflow;
public health returned 200 and anonymous `/auth/me` returned 401. UI changes remain
local for review, with production build, focused infinite-scroll/Lines/modal
checks, documentation and lint passing. Full authenticated browser latency is
not established by these checks.

## 13 November 2026: reuse server permissions across API calls

Backend PermissionService now reuses resolved grants for login and subsequent
operation checks. Company membership and page/source field rules share a
server-owned 60-second cache, isolated by database/user/Company/workspace. Warm
checks avoid their repeated permission SQL. Backend security writes invalidate
the generation, with commit/rollback handling and no publication of uncommitted
security changes. The single IIS server uses a dedicated file store; multi-node
operation requires shared storage. External SQL changes are bounded by TTL and
need explicit cache clearing for immediate revocation. Existing enforcement and
UI config remain; no database migration or posting change is involved.

Backend commit `ba981e1b` deployed successfully to IIS from the performance branch.
Public health returned 200 and unauthenticated `/auth/me` returned 401 afterward.
A pre-deployment read-only comparison matched 48 old/new permission decisions;
the old path issued 24 permission queries and warm new checks issued zero.
Authenticated browser latency against this deployed revision remains to be checked.

## 12 November 2026: reduce shared API startup and reuse selected batches

Identical ordinary Notes/Files transports now share route shapes through the
existing backend registry, retaining client URLs and owner authorization. Local
boot+health samples fell from 932–969 to 520–528 ms, routes from 20,909 to 7,553
and peak memory from 128 to 78 MB. Every published readable owner is matched in
Company and workspace scopes; unknown/unreadable owners and query/body source
spoofing remain rejected. Deployment clears stale route cache without raising
HTTP worker memory. These measurements do not establish end-user CRUD latency.

The UI reuses fresh partial selected-name batches within their exact dependency
and access scope, requesting only unknown codes in later batches. It reuses the
existing bounded page cache and does not promote partial DTOs to CRUD details.
Cold names still require a selected-value read. Config structure stays unchanged.

Backend commit `93ab158a` was deployed successfully through the Windows IIS
workflow. Three public-health samples from the same client measured 1.769–1.916 s
before deployment and 0.826–0.896 s afterward, all HTTP 200. These include network
time and establish a health/startup improvement only, not authenticated CRUD
latency, multi-user capacity or superiority over HLB.

## 12 November 2026: align Items card and FactBox with the current API

Items now uses 30 schema-matched fields across seven named sections, integer
enums and business-code lookups instead of obsolete UUID/string-enum bindings.
Manual No. creates through shared Core without waiting for Description/UOM;
automatic-numbering flags were removed because Item has no declared allocator.
The FactBox reuses the same identity, types and labels in four concise groups.
Obsolete nested worksheet shortcuts were removed; their page conversion remains
separate work. Installed metadata was checked read-only, with no product rows or
schema changes. Focused UI coverage exercises one create, in-flight edits,
changed-field PATCHes, full decimal strings, saved Refresh and FactBox labels.

## 12 November 2026: refresh unsaved entry and clear obsolete parent errors

Refresh no longer falls through to an early-return child refresh for an unsaved
Header. After confirmed discard it opens a fresh configured entry, clears old
validation/dirty state and cancels the previous autosave timer; cancel retains
input. Subsequent entry can create normally. Saved Refresh still reads Header
and Lines from the server. Missing-parent errors are replaced when valid Header
edits/create progress resume, using the existing shared status message.

## 12 November 2026: explain missing Header before child writes

The existing child-write guard remains. A line interaction/add/copy/paste before
Header creation now reports a visible error using the shared statusMessage.
The silent parent-based editor lock was withdrawn; configured editability remains.
Child POST/PATCH is blocked before Header POST success, during that POST, after
rejection, or when a required configured parent key is missing. The existing
shared status display renders the error once and exposes it as an accessible
alert. An additional error banner was withdrawn because it duplicated the message.
Business-key readiness includes headerPKProp/lineFKProp and parentFieldMap; it
does not infer relationships from systemId or field required flags. Users tests
cover rejected/pending Header creation and a later child POST using userName.

## 12 November 2026: publish lookup responses without an all-resource wait

The shared line resolver now publishes each completed selected-value batch with
its configured caption/fill instead of withholding all results until the slowest
lookup finishes. A received vendor name/address can render while country lookup
is still pending. Stored editable descriptions, row versions and ordinary CRUD
remain unchanged. Stale edits/navigation still reject late results. This fixes
an extra UI wait; it does not claim a cold API response arrives instantly.

## 12 November 2026: resolve saved lookup identities before choices

The provisional automatic first-page preparation and selected-name wait were
removed. Existing rows request only their missing saved identities in a bounded
batch; they do not load an unrelated ten records first. Users SECURITY/SUPER
names therefore use one filtered permissionSets read, with no unopened company
choice read for blank company scope. Opening the dropdown still loads ten
filtered choices, with scrolling and backend search. Code-only cold responses
still need that selected-name API; this does not claim to remove server latency.

## 12 November 2026: preserve selected values when opening dropdowns

The shared dropdown keeps the current caption when opened instead of replacing
it with an empty search editor. Search text remains separate from the stored
selection. Arrow focus no longer opens and immediately closes the popup; choosing
a result or explicitly clearing remains the only way to change the selection.

## 12 November 2026: keep lookup fill in UI config

The provisional backend permissionSetName virtual projection and the additional
projection-authorization code were withdrawn. Users keeps its existing configured
lookup/fill; no assignment API field is added solely to display a name. The
original userName update restriction remains. Existing exact scoped choice pages
can resolve selected names without another read, while partial DTOs remain
ineligible as complete CRUD detail records. Selecting a record fills arbitrary
configured targets locally; readonly/editable remains a config decision.

## 12 November 2026: reduce backend context and storage read setup

Company lookup and membership verification now share one record query. The
storage path's prior-value read and SET use one statement, and its returned
path is reused by existing metadata resolution. Original path restoration and
negative company-access cases remain covered without product-schema changes.
The provisional background dropdown preparation was subsequently removed.

A small local probe against the configured remote database measured roughly
721–728 ms for the previous storage setup and 443–455 ms for the corrected path
on the same connection (three samples per variant). This is setup-only evidence,
not a full-request improvement or a concurrency/capacity result. The observed
Windows development server and remote DB connection remain runtime bottlenecks.

## 12 November 2026: retire unused save port

An initial first-page preparation experiment was withdrawn because saved codes
outside that page could wait for choices and then require another API request.
Current behavior resolves saved identities directly and loads choices on opening.

The unused full-document autosave wrapper, global save port/service, provider and
barrel export were removed. Ordinary Header/Line CRUD retains its existing field
paths and failure retention. Create error wording now says record rather than
draft. Legacy save-port consumers must use the shared field CRUD path; this is
not a new page save extension point. Config formats and business document states
remain unchanged. Live user-visible latency still needs runtime verification.

## 12 November 2026: shared dropdown and API startup cleanup

Data-cache identity no longer parses/serializes the entire permission matrix per
record; stored-grant changes still revoke cached/in-flight reads. A configured
header lookup bypasses legacy dropdown loading. Popup positioning responds to
size/scroll/resize changes rather than every view check. Collection lookups match
the requested configured identity instead of accepting the first returned row.
Header and line dropdowns now request ten choices, continue on scroll and search
on the server. Pending identical requests survive the listener handoff between
reopens/rows instead of being cancelled and restarted. Fresh cached reopen and
in-flight reuse are checked through the real shared DataSource. HLB eager-load
behavior and official BC/SAP design references are documented without claiming
their internals or universal page-size defaults.

Backend bounded collections avoid a duplicate query-profile pass. Company choice
DTOs now honor shared filtering/paging instead of reading the entire collection.
Routing declarations reuse validation while source config is unchanged. Existing
controller discovery participates in Laravel config caching; package registration
and older-cache compatibility remain supported. Large route generation and live
dropdown/saving responsiveness remain separate acceptance work.

## 12 November 2026: remove duplicate ordinary CRUD authorization query

Generated ordinary CRUD routes now rely on the existing EntityRuntime permission
boundary instead of querying the same grant again in generated route middleware.
Users/PR endpoints and Config + TypeScript + Shared Components remain unchanged.
Business-controller and explicit middleware checks remain in place. Focused
database-free verification checks the generated routes, retained custom checks
and rejection of an unauthorized read by the real shared Runtime.

## 11 November 2026: PR and Users shared CRUD request correction

Shared Header/Line autosave now keeps one request in flight per record and sends
the latest pending edits after success, retaining edits on failure without an
automatic retry. Initial Card captions use the existing form/grid owners instead
of duplicate page hydration; optional selected names do not block business rows.
PR resolves its shared No. column only against the active Item/G/L binding.
Returned codes/names now display directly; PR No./UOM/Location codes no longer
cause initial master reads just to display the same values. Dropdown fill uses
its chosen record immediately. Missing-name reads remain bounded and separate
from record loading; saved editable Descriptions are preserved.
Users assignment names follow the existing UI lookup/fill configuration. The
provisional backend projection was withdrawn on 12 November; it is not the
current assignment contract. Prepared/scoped lookup records are reused for names.
Header/Lines load failures, business-key relations, permissions and row versions
remain protected. PR Request Date is optional, matching its nullable column.
PR's existing shared numbering behavior now accepts code-based series: manual No.
or a selected No. Series creates the Header first. Quantity's unrelated master
prerequisite was removed. The remaining `requiredDate` keys name optional date
fields; they are not required-field rules. No new required fields were added.
Unreachable legacy page-wide option preloading/background expansion helpers were
removed; existing on-demand dropdown loading remains. Bundle budgets are unchanged.

Laravel reuses resolved source/model metadata inside an invalidation-aware,
database/search-path-scoped request. See [autosave](/documentation/core/fields-and-validation),
[lookups](/documentation/core/lookups-and-fill) and
[backend queries](/documentation/backend/queries-and-concurrency).
Regression coverage verifies controlled request counts; this is not live latency
or million-record acceptance. Older PR tests were aligned with current business
code fields and the manual-or-series Header Number contract.

No. Series config now uses `/noSeries` and `/noSeriesLines`, binds `code` to
`seriesCode`, and uses `incrementByNo`/`open`. Description and Starting Date are
optional. The current database has no PR-default-series field in Purchases &
Payables Setup; PR can select an existing series directly. No new setup column
or product database migration was added. Normal numbering uses the existing
NumberSeriesService, keeps Company scope and transactional counter updates, and
protects used series lines. Sequence-mode allocation remains unsupported.

## 7 November 2026: consistent list loading position

Initial loading and refreshing an existing list now place the existing indicator
in the center of the table body. Refresh still retains the existing rows and
does not block their interaction. Background-save notices remain separate and
continue reporting unconfirmed writes after an editor closes; they are not
replaced by a list-loading indicator. This presentation correction does not
change write queues, save confirmation, retries or API timing.

## 7 November 2026: four consistent CRUD page references

Aligned PR Document/List, Payment Terms Card/List, Source Code Setup and Company
Access Worksheet against current declarations and individual migrations. Kept
the same HTML/TypeScript/Config/FactBox files and expanded configuration pattern.
Corrected retired master GUID fields to stored codes/numbers and collection-based
lookup reads; removed Payment Terms' nonexistent Active field and obsolete decimal
limit. PR record responses reuse the existing Enum-aware Resources. Normal PR
authoring requires a manual No.; automatic numbering and business command behavior
remain deferred. See [the four examples](/documentation/frontend/page-pattern).

## 7 November 2026: individual backend API source declarations

Restored individual thin Laravel controllers in place of the consolidated table
controller. Removed its bulk publisher, which stripped individual declarations.
All 765 relocated effective API contracts retain their existing endpoints,
permissions and operation restrictions. Business command controllers and Angular
page configuration remain unchanged. See
[table and API development](/documentation/backend/table-and-api).

## 7 November 2026: remove retired capability discovery

Removed the unused `apiCapabilities` HTTP loader and its metadata parser/cache,
inferred API methods, field rules, lookup search and nullable-to-null defaults.
Page configuration and the existing Company login permissions remain the UI
inputs. Explicit field defaults, including `null`, are preserved. Existing
payload aliases/allowlists, CRUD hooks, ETags, autosave/manual save and Angular
Header–Line links remain in their shared implementations. No replacement
discovery endpoint or backend/schema change was added.

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
