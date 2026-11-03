# Sales Part 2 — tables and API publication

**Status:** Backend migrations committed on `schema/bc-aligned-sales-part2-20261103`. PostgreSQL migration, runtime API verification, and backend merge are **not completed**. This is a schema reference, not a declaration that Sales UI pages are implemented.

## Sales Order BC Table 36/37 acceptance correction

**Do not treat this page as an accepted BC-aligned Sales Order module.** The latest source review compared Microsoft BC Sales Header (Table 36) and Sales Line (Table 37) with TecSA's actual migration and `SalesOrderService`:

- The physical Sales Order Header/Line tables exist, but new sell-to/bill-to/ship-to, pricing, dates and shipment fields are not all populated or enforced by the domain service.
- The SQL constraint and current order service use `line_amount = quantity × unit_price`. BC line discounts, invoice discounts and VAT amounts are **not yet implemented** by merely adding nullable fields. The API now rejects unsupported Sales Order discount and posting-owned quantity input instead of silently accepting it.
- BC supports more Sales Line types than TecSA currently validates; existing code allows `item` and `gl_account` only.
- Shipped/outstanding quantity is presently derived from posted shipment lines by the service. Added physical quantities should not be assumed authoritative until posting-state ownership is verified.
- Full Sales Order → Shipment → Invoice → Credit Memo and Return compatibility is still **pending**. Neither API acceptance nor full BC parity has passed.

**Developer guidance:** Do not expose those new fields as editable page-config inputs or promise accounting behavior until backend operations, validation, financial posting and PostgreSQL regression tests are accepted. **Consultant guidance:** Do not certify discounts, multiple line types, complete shipping statuses or reporting from unpopulated physical fields.

[Source-level Sales Order acceptance audit](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-finance-part4-20261103/docs/database/BC_SALES_ORDER_36_37_ACCEPTANCE_AUDIT.md).

## Additional Sales table-first database corrections

**BC Sales Header/Line archive coverage:** The backend integrated development branch now adds `sales_document_archives` (versioned Header) and `sales_document_archive_lines` (versioned Lines) through migration `000208`. These tables use Company-scoped technical keys, archive version and document occurrence, and full JSONB source-record snapshots so that fields are not silently omitted from archived versions. The two new ApiSource declarations are **read-only**. No archive command is implemented yet.

**Sales Order line discount storage:** Migration `000209` removes the old constraint that always forced `line_amount = quantity × unit_price`. It replaces that rule with constraints limiting discount percentage and discount amount to valid ranges. This makes the physical schema less incompatible with BC discounts, but **does not make discount calculation or posting operational**. Existing SalesOrderService still rejects unimplemented discount inputs.

**Consultant note:** A new archive table does not mean automatic archiving is live; a discounted line can be represented by the database but cannot yet be entered and posted through the current Sales Order business service. These changes are committed to the development chain, not migrated or accepted in a PostgreSQL runtime.

## New tables (17)

| Area | Physical table | Purpose |
| --- | --- | --- |
| Sales Quote | `sales_quotes` | Draft header |
| Sales Quote | `sales_quote_lines` | Draft lines |
| Blanket Sales Order | `blanket_sales_orders` | Draft header |
| Blanket Sales Order | `blanket_sales_order_lines` | Draft lines |
| Sales Shipment | `sales_shipments` | TecSA-specific draft shipment header |
| Sales Shipment | `sales_shipment_lines` | TecSA-specific draft shipment lines |
| Quote Status | `sales_quote_status_entries` | Status history |
| Blanket Order Status | `blanket_sales_order_status_entries` | Status history |
| Draft Shipment Status | `sales_shipment_status_entries` | Status history |
| Invoice Charges | `sales_invoice_item_charge_lines` | Charge lines |
| Invoice Charge Assignment | `sales_invoice_item_charge_assignments` | Charge allocations |
| Posted Invoice Charges | `posted_sales_invoice_item_charge_lines` | History |
| Posted Invoice Assignments | `posted_sales_invoice_item_charge_assignments` | History |
| Credit Memo Charges | `sales_credit_memo_item_charge_lines` | Charge lines |
| Credit Memo Assignments | `sales_credit_memo_item_charge_assignments` | Charge allocations |
| Posted Credit Memo Charges | `posted_sales_credit_memo_item_charge_lines` | History |
| Posted Credit Memo Assignments | `posted_sales_credit_memo_item_charge_assignments` | History |

Migration references: `2026_11_03_000200`, `000203`, and `000206`.

## Existing tables extended or corrected

| Area | Physical tables | Migration |
| --- | --- | --- |
| Sales Order | `sales_orders`, `sales_order_lines` | `000201`, `000204` |
| Sales Invoice | `sales_invoices`, `sales_invoice_lines` | `000201`, `000204` |
| Sales Credit Memo | `sales_credit_memos`, `sales_credit_memo_lines` | `000201`, `000204` |
| Sales Return Order | `sales_return_orders`, `sales_return_order_lines` | `000201`, `000204` |
| Posted Shipment | `posted_sales_shipments`, `posted_sales_shipment_lines` | `000201` |
| Posted Invoice | `posted_sales_invoices`, `posted_sales_invoice_lines` | `000201` |
| Posted Credit Memo | `posted_sales_credit_memos`, `posted_sales_credit_memo_lines` | `000201`, `000207` |
| Posted Return Receipt | `posted_sales_return_receipts`, `posted_sales_return_receipt_lines` | `000201`, `000207` |
| Customer Ledger | `customer_ledger_entries`, `customer_detailed_ledger_entries` | `000202` |
| Application Register | `ledger_application_registers` | `000202` |
| Sales Setup | `sales_receivables_setup` | `000205` |

New Sales source controller declares **17 ApiSource endpoints**, not 17 working UI pages. Six are draft header/lines, three status-history read-only APIs and eight item-charge APIs (posted history sources are read-only). Check API discovery and permissions after migrations.

## Sales Order physical field catalog — for developers

A source-extracted inventory of the actual `sales_orders` and `sales_order_lines` physical columns has been committed separately. It distinguishes original migration fields from additive fields. This is useful for page configuration and DB review but does **not** certify that every BC Table 36/37 field and behavior is operational.

[Exact Sales Order Header/Line field catalog](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-finance-part4-20261103/docs/database/SALES_ORDER_PHYSICAL_FIELD_INVENTORY.md).

The integrated backend branch now has 19 Sales supplemental ApiSource declarations including read-only archives. For consultants, the new archive and pricing schema is not yet an accepted business workflow.

## Header–Line relationships

| Header | Lines | Parent foreign key |
| --- | --- | --- |
| `sales_quotes` | `sales_quote_lines` | `sales_quote_id` |
| `blanket_sales_orders` | `blanket_sales_order_lines` | `blanket_sales_order_id` |
| `sales_shipments` | `sales_shipment_lines` | `sales_shipment_id` |
| `sales_orders` | `sales_order_lines` | `sales_order_id` |
| `sales_invoices` | `sales_invoice_lines` | `sales_invoice_id` |
| `sales_credit_memos` | `sales_credit_memo_lines` | `sales_credit_memo_id` |
| `sales_return_orders` | `sales_return_order_lines` | `sales_return_order_id` |

TecSA uses `system_id` for technical row identity and `company_id` for scope; document numbers are business identifiers. The existing generic Core owns CRUD, metadata, field conversion, and permission enforcement. Do not create duplicate page APIs.

## BC reference and important distinction

Business Central uses Sales Header (36) and Sales Line (37) for multiple document types; TecSA deliberately uses separate physical tables. BC's *Sales Shipment Header/Line* refers to **posted history**; TecSA `sales_shipments` is a distinct, unposted draft document.

Physical fields include customer/bill-to/ship-to snapshots, shipment dates, currency, VAT, line quantities and source references. Not every field belongs on every document. Calculated BC FlowFields/FlowFilters must not be stored by imitation; historical accounting quantities and amounts must not be recalculated in the UI.

## Readiness and further review

- Verify migrations in a dedicated PostgreSQL test database, including company-schema provisioning and indexes.
- Verify API source discovery, routes, permissions and Header–Line ownership. Schema existence alone is not CRUD acceptance.
- Confirm posted source-link alternatives and preserve immutable posted accounting history.
- Sales posting services have **not** been integrated with all new item charge tables; no end-to-end posting acceptance claim is made.
- Do not merge backend or run local production migration until all dependent Purchasing/Sales migrations are accepted.

See [Table and API](/documentation/backend/table-and-api), [Business relationships](/documentation/backend/business-relationships), [Header and lines](/documentation/frontend/header-and-lines), and [Purchasing Part 1](/documentation/modules/purchasing-pr28-database).

[Backend Sales Part 2 code and checkpoint](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-sales-part2-20261103/docs/database/BC_SALES_PART2_SCHEMA_AND_API_CHECKPOINT.md).
