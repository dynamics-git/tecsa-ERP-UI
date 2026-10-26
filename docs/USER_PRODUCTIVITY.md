# Shared user productivity

Status: implementation and focused verification of the first productivity increment. This is **not completion of the full master checklist**, nor approval to begin posting or commercial rollout.

## Existing architecture

Feature pages continue to declare their header, line and list metadata. `ListPage`, `DocumentWindow`, `DynamicForm`, `DocumentLines`, the existing command assembler, `DataSourceService` and RunModal own rendering, authorization and persistence. No additional component, CRUD service, backend entity declaration or command registry was introduced for this increment.

## Available controls in this increment

| Surface | Capability | Entry point |
| --- | --- | --- |
| List | Copy selected loaded rows | Existing Export menu → Copy selected rows; active row when no multi-selection exists |
| List | Auto-fit a column | Columns → Auto-fit, or double-click its resize handle |
| List | Freeze a column prefix | Columns → Freeze on the final column in the prefix; click again to unfreeze |
| Document / worksheet lines | Copy or duplicate one/multiple populated lines | Existing line commands → Copy Line |
| Lines | Copy one field from the previous row | F8 in the target cell |
| Lines | Fill the focused field down selected rows | Ctrl/Cmd+D; first selected row supplies the value; readonly target rows are skipped |
| Lines | Copy visible selected values to Excel | Copy Rows; Ctrl+C when the grid itself has focus preserves normal text copying inside inputs |
| Lines | Paste new Excel rows | Paste Lines starts at the first editable column; multi-cell Ctrl+V starts at the focused column |
| Lines | Validate before paste | Isolated preview, field errors, Cancel and Apply; existing rows remain intact |
| Header / lines | Enter quick entry | Enter moves to the next eligible input; Shift+Enter reverses; normal Tab remains available |

Quick entry leaves textarea newlines, select behavior and open lookup keyboard selection intact. It skips hidden, collapsed and disabled fields and stays within the owning document/popup.

### Copy and paste safety

- Copy Line takes only configured editable create inputs. IDs, row versions, company/parent ownership, line numbers, status, internal metadata and calculated targets are excluded. The backend assigns identity/numbering and validates business rules.
- New copied/pasted lines append after populated rows. This matches server-assigned append numbering; it does not implement Insert Above/Below.
- Autosaved new lines use the existing create path sequentially. On the first failure, further creates stop and remaining drafts stay visible and dirty. No automatic retry is added. Manual-save configurations retain drafts for their existing Save behavior.
- A batch is **not a server transaction**: earlier confirmed lines remain saved if a later line fails. An uncertain result is not treated as permission to retry.
- Current interactive limit: 20 new rows, 2,000 cells and 1 MB of clipboard text per paste. This is an interactive editing feature, not a large import job.
- Lookup paste accepts an exact code or UUID, honors declared company/parent/dependency filters and verifies at most two matches. Identical values in the same context share a read. It does not download complete master tables.
- A blank cell for an inapplicable conditional field is ignored; a supplied value is rejected. Required and decimal validation still applies. A changed document, company or access scope invalidates the preview.
- Copy/export contains visible columns only and escapes spreadsheet formula text. Copy Rows includes visible readonly columns; when pasting a new row, supply editable columns in the shown preview order rather than blindly pasting an entire exported row with system/calculated fields.
- Client permissions improve the UI; backend authorization and validation remain authoritative.

### Partner configuration

Existing line-toolbar overrides control these commands, including labels, order, grouping, disabled and hidden state. For example, add `{ label: 'Copy Line', actionKey: 'cmd:line-copy', hidden: true }` to an existing `lineConfig.toolbarButtons` to suppress the default. `cmd:line-paste` and `cmd:line-copy-rows` use the same mechanism. Create permission and resource create support still apply.

Add `quickEntry: false` to an existing header field or line column to omit it from Enter quick entry. The field remains reachable by normal Tab. No second field declaration is needed.

Freeze, widths and column order use the existing per-user/company/workspace personalization and saved-view state. Auto-fit measures at most 500 already loaded rows and never fetches additional records.

## Purchase Requisition reference configuration

- Uses `autoSave: true`, automatic numbering and lazy draft creation, matching the existing Items pattern. The separate configured Save button is removed.
- List columns inherit header metadata with `listColumns`; genuine list-only aggregate fields remain explicit.
- Writable header/line inputs derive through the existing config defaults instead of repeating create/update field lists. Business ownership, navigation, state and permission restrictions remain explicit.
- No. remains `valueType: 'code'` with create-only editing. Historical lowercase number-series data is deliberately unchanged in this increment.
- `calculation` declares the line amount formula; `totalsCalculation` declares its sum; `footerSections` places Estimated Total beneath the lines. The redundant header total field is removed. These use the existing calculation engine; persisted six-decimal amounts remain backend-authoritative.

## Evidence

Focused automated checks cover protected fields, permissions, ordered create responses, failed draft retention, worksheet command reuse, exact lookup verification, stale context, F8/fill-down, quick-entry navigation, list copy/freeze/auto-fit, and existing field/lookup/delete/presentation contracts. Build and import/token guardrails are also required. This is not a full regression suite or a concurrency/load certification.

A real test requisition was created through the UI at the user's request, marked `UI PRODUCTIVITY TEST ... Do not approve or post`, and left in Open status. Acceptance exercised header/line autosave, Copy Line, F8, two-row Excel preview/apply, close/reopen and read-only database verification. Four separate line identities and server line numbers 10000–40000 persisted. Quantities/costs were retained at six decimals; amounts were 32.913568, 32.913568, 62.000016 and 77.500031. The exact sum is 205.327183; the existing footer formatter displays 205.33. No approval, posting, conversion or deletion was performed.

## Remaining master-checklist scope

`Existing` below means an existing source-level foundation, not an assertion that every business page has passed acceptance. `Pending` includes features requiring further design or integration; they are not silently marked Done.

| Area | Existing / exercised foundation | Still pending or not accepted |
| --- | --- | --- |
| List | CRUD/open, refresh, search, advanced/value filters, sorting/grouping, saved views, column show/hide/order/resize, density, selection, paging/virtualized rendering; new copy/auto-fit/freeze above | A complete configurable bulk-edit/bulk-action UX across supported pages; record link copying |
| Header/card | Dynamic fields, required/conditional state, dependent lookups, autosave, collapse/expand, validation, unsaved protection; new Enter quick entry | Save & Close/New where manual mode is deliberately selected; next/previous record; policy-driven Copy Document |
| Lines | Existing add/delete/selection/lookups/validation/auto-add/totals; new duplicate/F8/fill-down/paste above | Server-policy Insert Above/Below; explicit line focus mode; personal quick-entry field selection |
| RunModal/lookup | Existing nested windows, context navigation, loading, parent retention, focus and unsaved guards; existing lookup keyboard/search/paging contracts checked | Dedicated acceptance for multi-select return and permitted create-from-lookup; all popup resize/keyboard combinations |
| FactBox | Existing overview/related data, notes, attachments and preview components, visibility and actions | Per-business-page related history/summary acceptance and all contextual actions; no redesign included here |
| Navigation | Existing Tell Me/menu permission foundation, company selection, notification inbox | Business-record global search, recent records, favorites/bookmarks, working date, record deep links/multiple-window acceptance |
| Personalization | Existing views/columns/filter/density and user/company storage; new freeze state | User-selected quick-entry fields and broader page-layout preferences |
| Reporting/sharing | Existing loaded-row Excel/CSV/Word and print/browser PDF export, attachments | All-matching server export, record links, email/send/share workflow, document templates |
| Enterprise safety | Existing scoped data, permissions, validation, row versions, background-save/unsaved machinery; new protected copy/paste guards | Full cross-page acceptance, large-data/load and concurrent-user evidence; general server idempotency/long-job guarantees are not established by these UI changes |

The local PR test validates the productivity path above. It does not complete PR → PO → PI business workflow acceptance or the full master checklist.
