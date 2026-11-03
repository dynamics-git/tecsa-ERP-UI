# Purchasing Part 1 — PR #28 physical database tables

## Phase A integrated cross-module additions (symbol-backed)

On the integrated backend schema branch `schema/bc-aligned-finance-part4-20261103`, Microsoft Base Application 26.1 Purchase Header (38), Purchase Line (39), Order Address (224), Vendor Bank Account (288) and Vendor Invoice Disc. (24) have been reviewed as **physical database references**, not production business processes. The later additive migrations `000220`, `000222`, `000223` and `000224` link Purchasing to the shared Purchaser, Shipment Method, Tax Area/Group, Vendor Order Address and invoice-discount tier masters, while preserving posted Purchase source snapshots. Vendor banking is in migration `000221`, with generic API operations disabled for sensitive account details. These migrations are on the **integrated branch**, not necessarily the original Part 1 PR branch; neither tested nor migrated. Projects, Manufacturing and Resource Capacity remain deferred.

This page is the UI-facing table inventory for [backend PR #28](https://github.com/dynamics-git/tecsa-erp-26.0/pull/28) (source commit `ea0b56e`). **Migration code is committed but PostgreSQL execution and API discovery are not yet verified.** No UI module implementation is implied.

TecSA uses separate document header/line tables and `system_id` as row identity. Fields and table publishing come from backend migrations and ApiSource; UI config supplies page presentation, lookups, actions and required-field UX. Do not infer that a table automatically creates a page.

## New physical tables (13)

| Document / area | New table | Role |
| --- | --- | --- |
| Quote | `purchase_quotes` | Header |
| Quote | `purchase_quote_lines` | Lines |
| Blanket PO | `blanket_purchase_orders` | Header |
| Blanket PO | `blanket_purchase_order_lines` | Lines |
| Draft GRN | `purchase_receipts` | Unposted receipt header |
| Draft GRN | `purchase_receipt_lines` | Unposted receipt lines |
| Quote history | `purchase_quote_status_entries` | Status events |
| Blanket PO history | `blanket_purchase_order_status_entries` | Status events |
| Draft receipt history | `purchase_receipt_status_entries` | Status events |
| Credit memo item charge | `purchase_credit_memo_item_charge_lines` | Charge lines |
| Credit memo item charge | `purchase_credit_memo_item_charge_assignments` | Charge assignment |
| Posted credit memo item charge | `posted_purchase_credit_memo_item_charge_lines` | Posted charge lines |
| Posted credit memo item charge | `posted_purchase_credit_memo_item_charge_assignments` | Posted assignments |

Created by migration files `000100`, `000105`, `000111`, `000113` dated 2026-11-03. New quote, blanket and receipt tables receive further columns in `000103`, `000106`, `000110`.

## Existing tables extended or corrected

| Group | Existing physical tables | Primary migration groups |
| --- | --- | --- |
| Purchase Order | `purchase_orders`, `purchase_order_lines` | `000101`, `000103`, `000106`, `000110` |
| Purchase Invoice | `purchase_invoices`, `purchase_invoice_lines` | `000101`, `000103`, `000106`, `000110` |
| Purchase Credit Memo | `purchase_credit_memos`, `purchase_credit_memo_lines` | `000101`, `000103`, `000106`, `000110` |
| Purchase Return Order | `purchase_return_orders`, `purchase_return_order_lines` | `000101`, `000103`, `000106`, `000110` |
| Posted Purchase Receipt | `posted_purchase_receipts`, `posted_purchase_receipt_lines` | `000103`, `000107`, `000108`, `000114` |
| Posted Purchase Invoice | `posted_purchase_invoices`, `posted_purchase_invoice_lines` | `000103`, `000107`, `000108`, `000114` |
| Posted Purchase Credit Memo | `posted_purchase_credit_memos`, `posted_purchase_credit_memo_lines` | `000103`, `000107`, `000108`, `000114` |
| Posted Return Shipment | `posted_purchase_return_shipments`, `posted_purchase_return_shipment_lines` | `000103`, `000107`, `000108`, `000114` |
| Inventory and value/application entries | `item_ledger_entries`, `value_entries`, `item_application_entries`, `cost_application_entries` | `000104`, `000109` |
| Accounts and tax entries | `vendor_ledger_entries`, `vendor_detailed_ledger_entries`, `vat_entries`, `gl_entries` | `000104`, `000109` |
| Invoice item-charge tables | `purchase_invoice_item_charge_lines`, `purchase_invoice_item_charge_assignments`, `posted_purchase_invoice_item_charge_lines`, `posted_purchase_invoice_item_charge_assignments` | `000112` |
| Purchase setup | `purchases_payables_setup` | `000105` |

The existing `purchase_requisitions` and `purchase_requisition_lines` remain the baseline PR tables; PR #28 did **not** create them. Migration `000102` revises draft constraints and `000114` revises permissible posted source links. Field extensions do not rewrite ledger postings, costing algorithms, or existing posted amounts.

## Header–Line design for UI configuration

| Header | Lines | Parent binding |
| --- | --- | --- |
| `purchase_quotes` | `purchase_quote_lines` | `purchase_quote_id` |
| `blanket_purchase_orders` | `blanket_purchase_order_lines` | `blanket_purchase_order_id` |
| `purchase_orders` | `purchase_order_lines` | `purchase_order_id` |
| `purchase_receipts` | `purchase_receipt_lines` | `purchase_receipt_id` |
| `purchase_invoices` | `purchase_invoice_lines` | `purchase_invoice_id` |
| `purchase_credit_memos` | `purchase_credit_memo_lines` | `purchase_credit_memo_id` |
| `purchase_return_orders` | `purchase_return_order_lines` | `purchase_return_order_id` |

These are relation *candidates* for UI setup; check each actual database foreign key and published API metadata first. PR's current UI config uses a composite business relationship: see [Purchase Requisition](/documentation/modules/purchase-requisition) and [Business relationships](/documentation/backend/business-relationships). Do not replace that existing PR relationship with a guessed SystemId binding.

## Physical field families for UI planning

- **Identity:** `system_id`, `company_id`, `document_type`, `number`, `document_number`, `line_no`.
- **Vendor and pay-to:** `vendor_id`, `vendor_no`, `vendor_name`, `pay_to_vendor_no`, `pay_to_vendor_name`.
- **Dates:** `order_date`, `document_date`, `posting_date`, `expected_receipt_date`, `requested_receipt_date`, `promised_receipt_date`.
- **Location and dimensions:** `location_code`, `ship_to_code`, `dimension_set_id`, posting-group fields.
- **Quantity and value:** `quantity`, `quantity_received`, `quantity_invoiced`, `direct_unit_cost`, `line_amount`, `currency_factor`, `vat_percent`.
- **Posting references:** document/source numbers, source line references, application and entry numbers.

These are examples across the changed tables, **not** a claim that every table has every field. FlowFields or FlowFilters are not added as physical columns. Exact column/type inventories must be checked in [backend field catalog](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-purchasing-part1-20261103/docs/database/PURCHASING_TABLE_FIELD_CATALOG.md) and actual migrated schema. The catalog describes a source baseline, not the final live DB.

## Acceptance checkpoints

1. Back up the target PostgreSQL database and execute migration `000100`–`000114`; inspect field types, keys, constraints, data preservation and company schema propagation.
2. Verify the 13 ApiSource declarations via existing generic Core schema discovery and test the intended API access. A table or ApiSource alone does not prove a working UI page.
3. Create or update page configs against verified API fields with correct Header–Line bindings and explicit UI validation. Do not add a parallel API or duplicate Core logic.
4. Treat posted documents and ledgers as history/read-only unless explicit backend domain actions permit changes.
5. Keep database, API and UI acceptance separate. **Neither PR #28 migration success nor its merge has been confirmed here.**

See also [Table and API](/documentation/backend/table-and-api), [Header and lines](/documentation/frontend/header-and-lines) and [Page patterns](/documentation/frontend/page-pattern).
