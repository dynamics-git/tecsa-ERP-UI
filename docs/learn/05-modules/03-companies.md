# Companies: create, switch, copy and delete

## Physical Company storage

The backend keeps the existing workspace database. Each Company has its own
PostgreSQL schema with independent business tables, indexes, FKs and triggers.
Shared users/security/sessions remain shared. API URLs, configuration, worksheet,
RunModal, SystemId and business Header–Line mappings remain unchanged.

After controlled backend cutover, ordinary creation provisions Company tables.
Copy reads the selected Company's schema and writes a new Company's schema;
Delete removes only its storage/scoped access. Existing companyId fields remain
for API compatibility/audit, not as routing into shared business tables. Fields
and SDK tables use one backend definition and coordinated migrations.

Rollout requires a verified database/private-files backup and stopped writers.
Use `companies:migrate-storage --force` for the current database or
`workspaces:migrate --workspace=SLUG --force` for ready workspace databases.
Failed cutover rolls back transactionally. After success, rollback means restoring
the verified database/files backup and matching code; do not merge schemas blindly.
Keep writers stopped through acceptance so rollback cannot lose newer writes.

The configured development database completed this cutover on 2 November 2026.
TECSA is its only Company, with 152 independent business tables. The shared schema
retains directory/security infrastructure; the empty canonical template is a table
definition source, not another Company or a second copy of Company data.

Two journeys use the existing foundation:

- Header **Company** opens the searchable **Change company** drawer, showing
  companies the current user can access.
- **Administration → Company → Companies** opens the editable administration
  worksheet through existing RunModal, using page ID `companies`. The direct
  `/companies` URL remains available like other registered worksheet routes.

## Create and edit

Use the standard **New** action to append a blank row, or enter a blank grid row.
There is no separate New company command. **Delete** is the standard Core action,
including RunModal, using Core confirmation, loading state and DELETE transport.
There is no custom Delete company button or page-specific delete request handler.

Enter Code and Name in a new row. Both are API prerequisites before the first
POST; opening the page creates nothing. Shared Core creates the record and
autosaves subsequent changed fields. No Save button is needed. Code becomes
readonly after creation; Name, Display name and Active remain editable.

ListPage, LineConfig and DataSourceConfig come from public-api. CRUD, versions,
errors and pending writes stay in Core. Page TS handles exceptional operations.
The page follows the PR component/config/HTML pattern: its HTML binds the shared
ListPage directly. There is no separate Companies workspace component, dynamic
component loader or page stylesheet. Copy uses shared dialogs and LoadingIndicator;
ordinary deletion stays entirely in the existing shared delete workflow.

## Copy

Finish pending edits, select one saved company and choose **Copy company**.
Enter a new code/name and choose:

| Choice | Result |
| --- | --- |
| Setup and master data — no transactions | Setup, posting groups, payment terms, number series, dimensions, accounts, customers, vendors and items. No documents/journals/ledger history. Number usage resets. |
| Entire company — for testing | Setup/master plus company-owned operations/history, Notes and independent attachment files. Number usage remains. |

The shared prompt explicitly shows **Copy from: code — name** using the selected
row supplied by Core. That row's systemId addresses the copy API; the new code/name
belong to the destination. The prompt stacks fields vertically, with a
**Create copy** action. Preparing or cancelling the form shows no operation loader.
Only after submission does the shared progress dialog display **Copying company…**.
Escape, backdrop dismissal and closing the company page are blocked while the
request is pending. Success/failure closes progress; failed parameters are retained.

Users, shared permission definitions and company access assignments are not
cloned. Inbox state is not copied; copied notification rules are disabled. Full
copy requests confirmation: integrations are not isolated and this is not a sandbox.

The destination has fresh record IDs and mapped references, retaining document
business numbers. Source data stays unchanged. Failure rolls back the destination
and keeps entered parameters for correction/retry.

Full copy includes Notes, mentions and independent attachment files. If a source
Note/file already points to a physically deleted parent, its content and historical
owner ID are preserved; the deleted parent is not recreated. Existing owners must
map to copied records. Missing attachment files are skipped, with the count shown
in the completion message; valid files and data still copy. Source rows are not
automatically deleted. Other storage failures still roll back the copy. This does
not introduce soft deletion or change permanent Note/file deletion.

Use **Users → Company Access** to grant access before expecting the new company
in that user's switcher. A copied company does not grant membership automatically.

## Delete

Switch away first. Select a saved company, choose **Delete** and review
the permanent-deletion confirmation. This removes the company and its owned data,
not merely its Companies row. Company-owned data/access bindings are
removed; shared users/security and other companies stay. Keyboard deletion cannot
bypass confirmation. The API checks authorization, visibility and current version.
The page's beforeDelete hook only rejects the current working company; the shared
Core owns confirmation, loading state, request execution and row removal.

Copy/delete blocks duplicate submissions and accidental editing/close/context
changes while running. Errors stay visible. Operations are synchronous; they are
not background jobs that can safely continue after stopping the browser/server.

## Developer support

Physical columns/FKs come from PostgreSQL. CompanyData supplies the business copy
category beside the model, or the optional SDK ApiSource companyData setting.
New ordinary columns copy without another field declaration. New company-owned
tables need their category; unknown tables stop copy/delete rather than being
silently included or omitted. No central copy-table registry is maintained.

Ordinary authoring remains Migration + Model + API Controller. Lifecycle business
logic does not replace ordinary CRUD with a collection-save endpoint. See
[table/API responsibility](/documentation/backend/table-and-api) and
[commands and RunModal](/documentation/core/commands-and-runmodal).

## Verification boundary

Focused backend checks use disposable data, including posted ledgers, SDK tables
and private files. UI integration checks create/autosave/reopen without Save.
Local migrations are applied and the unused empty roles prototype is removed;
the existing permission module is unchanged.

No real company was copied/deleted for acceptance. Browser visual inspection was
interrupted by URL-verification safeguards. Large-volume/background execution
remains unverified.
