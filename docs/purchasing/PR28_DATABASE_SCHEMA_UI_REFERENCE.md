# Purchasing Part 1 — PR #28 database change reference for UI

**Status:** Backend migration code committed; PostgreSQL execution and API discovery not yet verified. **This document does not mean the UI pages or workflows have been implemented.**

- Backend: [PR #28](https://github.com/dynamics-git/tecsa-erp-26.0/pull/28), branch `schema/bc-aligned-purchasing-part1-20261103`, source commit `ea0b56e`.
- UI: documentation-only branch. No feature components, routes, configs, API clients or permissions are changed by this document.
- Exact migration source: backend `database/migrations/2026_11_03_000100` through `000114`; baseline migrations remain authoritative for pre-existing columns.
- Full pre-PR field inventory: backend `docs/database/PURCHASING_TABLE_FIELD_CATALOG.md`. This inventory is based on source declarations, **not** a live PostgreSQL introspection.

## 1. NEW physical tables in PR #28 (13)

| Category | Table | Purpose / UI relationship | Migration |
| --- | --- | --- | --- |
| Purchase Quote | `purchase_quotes` | Unposted quote header | 000100 |
| Purchase Quote | `purchase_quote_lines` | Lines under quote header | 000100 |
| Blanket Purchase Order | `blanket_purchase_orders` | Blanket order header | 000100 |
| Blanket Purchase Order | `blanket_purchase_order_lines` | Lines under blanket order | 000100 |
| Draft Purchase Receipt / GRN | `purchase_receipts` | Editable receiving header, distinct from posted receipt | 000105 |
| Draft Purchase Receipt / GRN | `purchase_receipt_lines` | Lines under draft receipt header | 000105 |
| Status history | `purchase_quote_status_entries` | Quote workflow status events | 000111 |
| Status history | `blanket_purchase_order_status_entries` | Blanket order status events | 000111 |
| Status history | `purchase_receipt_status_entries` | Draft receipt status events | 000111 |
| Credit Memo Item Charges | `purchase_credit_memo_item_charge_lines` | Charge lines for unposted purchase credit memo | 000113 |
| Credit Memo Item Charges | `purchase_credit_memo_item_charge_assignments` | Unposted charge allocations | 000113 |
| Posted Credit Memo Item Charges | `posted_purchase_credit_memo_item_charge_lines` | Posted charge-line history | 000113 |
| Posted Credit Memo Item Charges | `posted_purchase_credit_memo_item_charge_assignments` | Posted charge-allocation history | 000113 |

**Important:** PR, Purchase Order, Purchase Invoice, Purchase Credit Memo, Purchase Return Order, the four posted document Header/Line pairs, and the existing ledgers were **not created** by PR #28; the PR changes their existing schemas.

## 2. EXISTING tables extended / corrected (by area)

| Area | Physical tables | Main migrations | Nature of the change |
| --- | --- | --- | --- |
| Purchase Order | `purchase_orders`, `purchase_order_lines` | 000101, 000103, 000106, 000110 | Header/line field alignment, document identity and BC-style physical fields |
| Purchase Invoice | `purchase_invoices`, `purchase_invoice_lines` | 000101, 000103, 000106, 000110 | Draft fields, document/source references, financial/tax snapshot fields |
| Purchase Credit Memo | `purchase_credit_memos`, `purchase_credit_memo_lines` | 000101, 000103, 000106, 000110 | Draft and return-related field alignment |
| Purchase Return Order | `purchase_return_orders`, `purchase_return_order_lines` | 000101, 000103, 000106, 000110 | Return header/line physical field alignment |
| New quote / blanket headers & lines (also subsequently extended) | `purchase_quotes`, `purchase_quote_lines`, `blanket_purchase_orders`, `blanket_purchase_order_lines` | 000103, 000106, 000110 | BC-style additions after initial table creation |
| New draft receipt / GRN headers & lines (also subsequently extended) | `purchase_receipts`, `purchase_receipt_lines` | 000106, 000110 | Receiving fields beyond initial table creation |
| Posted Receipt | `posted_purchase_receipts`, `posted_purchase_receipt_lines` | 000103, 000107, 000108, 000114 | Posted header/line snapshot and source-link coverage |
| Posted Invoice | `posted_purchase_invoices`, `posted_purchase_invoice_lines` | 000103, 000107, 000108, 000114 | Posted financial/document snapshots and optional source alternatives |
| Posted Credit Memo | `posted_purchase_credit_memos`, `posted_purchase_credit_memo_lines` | 000103, 000107, 000108, 000114 | Posted credit history and source alternatives |
| Posted Return Shipment | `posted_purchase_return_shipments`, `posted_purchase_return_shipment_lines` | 000103, 000107, 000108, 000114 | Posted return-shipment history and source alternatives |
| Inventory ledgers & application | `item_ledger_entries`, `value_entries`, `item_application_entries`, `cost_application_entries` | 000104, 000109 | Physical provenance / application / valuation fields; not a posting-engine rewrite |
| Payables & accounting | `vendor_ledger_entries`, `vendor_detailed_ledger_entries`, `vat_entries`, `gl_entries` | 000104, 000109 | Additional entry-history fields; existing amounts and posting keys preserved |
| Existing invoice item charges | `purchase_invoice_item_charge_lines`, `purchase_invoice_item_charge_assignments`, `posted_purchase_invoice_item_charge_lines`, `posted_purchase_invoice_item_charge_assignments` | 000112 | Item charge assignment/reference fields |
| Purchase setup | `purchases_payables_setup` | 000105 | Receiving number-series/setup support |

**Other existing structural corrections:** 000102 adjusts draft constraints/check blockers; 000114 adjusts valid posted-source alternatives. These are not new UI tables. The PR contains no purchase requisition table creation; existing `purchase_requisitions` and `purchase_requisition_lines` remain baseline tables.

## 3. Field families now available to evaluate in UI configs

The following are **examples of physical fields**, not a promise that every field is present in every table. Use schema discovery / ApiSource metadata to obtain each table's actual columns and types before configuring a page.

| UI group | Examples | Guidance |
| --- | --- | --- |
| Identity and source | `system_id`, `company_id`, `document_type`, `number`, `document_number`, `line_no`, source document/line references | Technical row identity is `system_id`; do not treat business number as the PK |
| Vendor / Pay-to | `vendor_id`, `vendor_no`, `pay_to_vendor_no`, `pay_to_vendor_name` | Use explicit lookup wiring, preserve snapshots on posted documents |
| Addresses & shipping | `ship_to_code`, `ship_to_name`, `ship_to_address`, `location_code` | Header FastTabs, not compulsory SQL fields |
| Dates | `order_date`, `document_date`, `posting_date`, `expected_receipt_date`, `requested_receipt_date`, `promised_receipt_date` | Per-document date applicability varies |
| Pricing & currency | `currency_code`, `currency_factor`, `direct_unit_cost`, `line_amount`, `line_discount_percent` | Use backend precision; do not duplicate cost calculation in UI |
| Taxes & posting | `vat_percent`, `vat_calculation_type`, posting groups, dimension fields | Posting ledger values are historical/accounting records |
| Quantity & warehouse | `quantity`, `quantity_received`, `quantity_invoiced`, `unit_of_measure_code`, `bin_code`, `variant_code` | Distinguish draft input from posted quantities |
| History & ledger | `entry_no`, `posting_date`, `document_no`, source/application references | Prefer read-only list/detail surfaces for posted entries |

## 4. Header–Line relationship model for UI

| Header table | Lines table | Relationship for UI configuration |
| --- | --- | --- |
| `purchase_quotes` | `purchase_quote_lines` | Quote header `system_id` ↔ line `purchase_quote_id` |
| `blanket_purchase_orders` | `blanket_purchase_order_lines` | Blanket header `system_id` ↔ line `blanket_purchase_order_id` |
| `purchase_orders` | `purchase_order_lines` | PO header `system_id` ↔ line `purchase_order_id` |
| `purchase_receipts` | `purchase_receipt_lines` | Draft receipt `system_id` ↔ line `purchase_receipt_id` |
| `purchase_invoices` | `purchase_invoice_lines` | Invoice `system_id` ↔ line `purchase_invoice_id` |
| `purchase_credit_memos` | `purchase_credit_memo_lines` | Credit memo `system_id` ↔ line `purchase_credit_memo_id` |
| `purchase_return_orders` | `purchase_return_order_lines` | Return order `system_id` ↔ line `purchase_return_order_id` |

For posted pairs and item charge allocations, confirm the *actual* foreign key and parent binding from backend migration/metadata before configuring subpages. No new generic relation engine or per-page custom API should be assumed.

## 5. UI integration and acceptance checklist

1. **First:** backup DB and successfully run PR #28 migrations in the intended PostgreSQL company schema; capture errors and resolve them **before** calling the schema accepted.
2. Verify new tables, extended columns, field types, nullability, indexes and foreign keys against the migrated DB (the source-field catalog alone is not sufficient).
3. Verify the PR's **13 new ApiSource declarations** and their schema discovery / CRUD/read eligibility. An ApiSource declaration does not itself create a UI page or guarantee working endpoints.
4. Implement/review UI pages using the existing platform list/header/line configurations; bind `system_id` to parent foreign keys. Avoid manually maintained duplicate column definitions where metadata supplies them.
5. Enforce UI-required inputs in page/form validation rather than indiscriminate database NOT NULL constraints. Respect existing Core permissions and posting rules.
6. Posted document and ledger pages should be treated as read-only history unless a backend operation explicitly supports an action; **do not** infer CRUD rights from the existence of a table.
7. Migration success, API acceptance, and UI acceptance are **three separate checkpoints**. PR #28 was not merged to main when this reference was written.

## 6. Source links

- [Backend PR #28 changed files](https://github.com/dynamics-git/tecsa-erp-26.0/pull/28/files)
- [Backend migration folder on PR branch](https://github.com/dynamics-git/tecsa-erp-26.0/tree/schema/bc-aligned-purchasing-part1-20261103/database/migrations)
- [Existing and proposed field inventory](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-purchasing-part1-20261103/docs/database/PURCHASING_TABLE_FIELD_CATALOG.md)
- [Company/Core and purchasing schema audit](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-purchasing-part1-20261103/docs/database/BC_PURCHASING_PART1G_EFFECTIVE_CONSTRAINT_AUDIT.md)

**Maintenance rule:** Update this document when PR #28 migrations change; do not describe unexecuted migrations as a live database state.
