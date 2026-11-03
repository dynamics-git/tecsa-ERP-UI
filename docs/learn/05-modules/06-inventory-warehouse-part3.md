# Inventory & Warehouse Part 3 — database and API guide

This guide is for **TecSA ERP developers and implementation consultants**. It records the backend Part 3 work in `schema/bc-aligned-inventory-warehouse-part3-20261103`. **Physical schema code has been committed but migrations, runtime API tests, and warehouse posting acceptance are not yet completed.** The UI `main` documentation page is not evidence that the backend changes are deployed.

## What is in Part 3

| Physical table | Purpose | API source |
| --- | --- | --- |
| `warehouse_receipts` | Unposted warehouse receipt header | `warehouseReceipts` |
| `warehouse_receipt_lines` | Receipt handling lines | `warehouseReceiptLines` |
| `warehouse_shipments` | Unposted warehouse shipment header | `warehouseShipments` |
| `warehouse_shipment_lines` | Shipment handling lines | `warehouseShipmentLines` |
| `warehouse_bin_contents` | Bin/item/variant setup; no separate stock quantity balance | `warehouseBinContents` |
| `inventory_reservation_entries` | Source-document reservation records | `inventoryReservationEntries` (read-only) |
| `inventory_tracking_specifications` | Lot, serial and package traceability | `inventoryTrackingSpecifications` (read-only) |
| `posted_warehouse_receipts` | Posted warehouse receipt header (history) | `postedWarehouseReceipts` (read-only) |
| `posted_warehouse_receipt_lines` | Posted warehouse receipt lines | `postedWarehouseReceiptLines` (read-only) |
| `posted_warehouse_shipments` | Posted warehouse shipment header (history) | `postedWarehouseShipments` (read-only) |
| `posted_warehouse_shipment_lines` | Posted warehouse shipment lines | `postedWarehouseShipmentLines` (read-only) |

Migration files: `2026_11_03_000300` creates receipt/shipment header/lines; `000301` creates bin content configuration; `000302` adds Warehouse Receipt/Shipment No. Series fields to `inventory_setup`; `000303` creates Inventory Reservation Entries and Tracking Specifications. The last two schemas are **not yet integrated** with reservation or posting services.

## Existing inventory and warehouse tables — do not recreate

| Area | Existing tables | What developers must preserve |
| --- | --- | --- |
| Warehouse organization | `warehouse_zones`, `warehouse_bins` | Location-scoped bin identity, mandatory bin constraints |
| Bin movement | `warehouse_bin_movement_registers`, `warehouse_bin_entries` | Existing bin-movement posting and immutable history |
| Warehouse picks | `warehouse_pick_worksheets`, `warehouse_pick_worksheet_lines` | Pick planning and registration |
| Pick reservations | `warehouse_pick_reservations`, `warehouse_pick_shipment_allocations` | Already-posted pick allocation history, not a generic source reservation engine |
| Inventory costing | `item_ledger_entries`, `value_entries`, `item_ledger_applications`, `item_cost_applications` | Costing, application and quantity history |
| Warehouse operations | Transfer, item-journal, cost-adjustment and posted pick activity tables | Existing posting services and historical consistency |

**Posted warehouse history versus posted trade history:** `posted_warehouse_receipts` and `posted_warehouse_shipments` represent warehouse handling documents; `posted_purchase_receipts` and `posted_sales_shipments` represent accounting/trade posting histories. These must not be conflated.

**No second quantity ledger:** Bin Content defines fixed/default/dedicated/block settings and item/bin assignment; on-hand, reserved and available stock must come from authoritative inventory/bin entries and domain calculations.

## Location integrity and tracking history — 3 November update

**Header–Line location correction:** The line's `(company_id, warehouse_receipt_id, location_id)` or `(company_id, warehouse_shipment_id, location_id)` now references the corresponding Header's `(company_id, system_id, location_id)`. Line Zone references also use `(company_id, location_id, zone_id)`. This prevents a non-null line Location from disagreeing with its Header and prevents selecting a Zone from another Location. A NULL Location on an unfinished draft is not a substitute for business validation at registration/posting.

**Developer contract:** Warehouse Receipt/Shipment Header and Line `zone_id` / `bin_id` foreign keys are location-scoped, not merely company-scoped. These database relationships must prevent a document for Location A from referencing a Bin or Zone belonging to Location B. Angular lookups should apply the same Location filter for usability; the database FK is the final authority.

**Existing posted/immutable warehouse records extended:** Migration `000305` adds nullable `variant_code`, `lot_no`, `serial_no`, `package_no`, and source-document information where appropriate to `warehouse_bin_entries`, `warehouse_pick_activity_entries`, `warehouse_pick_reservations`, and `warehouse_pick_shipment_allocations`. The code preserves existing record keys, quantities, posted allocation values, costing methods and immutable-entry behavior.

**Consultant interpretation:** A historical movement with an empty lot/serial field is *not proof* that the item was never tracked. Older transactions may predate these fields; the posting service is not yet wired to populate them. Do not use these columns for traceability reports until posting coverage, validation and historical-data policy are accepted.

**Verification:** Part 3 now includes a location-scoped FK checkpoint in `WarehousePart3SchemaCheckpointTest`. Its code is committed, but it has not been run on PostgreSQL in this work. Do not migrate or certify traceability from this documentation alone.

## Technical keys and parent–line relationship

| Header | Lines | Child FK |
| --- | --- | --- |
| `warehouse_receipts` | `warehouse_receipt_lines` | `warehouse_receipt_id` |
| `warehouse_shipments` | `warehouse_shipment_lines` | `warehouse_shipment_id` |

`system_id` is the technical row key. `company_id` scopes records. `number` and `line_no` are business identifiers. Generic ApiSource uses PostgreSQL field metadata and existing Core CRUD/permissions, not a second field-definition registry. The draft warehouse API also blocks generic writes to `status`, status-change audit fields and handled quantities; these are reserved for future domain commands rather than arbitrary field PATCH requests. Physical APIs alone do **not** implement Register, Post Receipt, Post Shipment, Create Pick, Apply Reservation or Assign Tracking actions. Four posted warehouse history APIs are read-only; the new posted history tables are not yet populated by posting services.

## Developer checklist: page and endpoint implementation

1. Verify backend migrations on a dedicated PostgreSQL test DB, including per-Company schema propagation and permission enforcement.
2. Inspect the published API's actual fields, then configure List, Document Header and Line pages using the shared Angular page engine. Do not hand-code a duplicate form/grid/lookup engine.
3. Bind Warehouse Receipt/Shipment Header–Line via the verified foreign keys above; preserve record identity and concurrency version.
4. Implement business actions only through backend domain commands with proper validations and posting transactions. Do not expose generic status or ledger mutation as if it were posting.
5. Treat `inventoryReservationEntries` and `inventoryTrackingSpecifications` as **read-only** until reservation pairing, availability checks, lot/serial lifecycle and posting hooks are integrated.
6. Execute targeted `WarehousePart3SchemaCheckpointTest` and check source-route registration before declaring the module accepted.

## Consultant implementation notes

**Receipt scenario:** Purchase Order → Warehouse Receipt → receipt handling/bin → posted purchase receipt & inventory posting. Currently the physical Warehouse Receipt tables exist in code; the warehouse receipt posting workflow itself has **not** been accepted. The already existing Purchase Receipt posting service is separate.

**Shipment scenario:** Sales Order → Warehouse Shipment → pick/ship handling → posted sales shipment. Existing pick and posted shipment flows must be reused, not bypassed. The new Warehouse Shipment document is not yet a completed end-to-end shipment command.

**Bin and tracking:** A consultant can plan location, zone, bin, fixed/default/dedicated use, lot/serial requirements and number-series configuration. This documentation does **not** guarantee that new bin content or reservation APIs have been migrated to a live Company schema.

**BC concept mapping:** Business Central Warehouse Receipt and Shipment are warehouse documents distinct from Posted Purchase Receipt or Posted Sales Shipment. BC Reservation Entry (Table 337) handles source order reservation, order tracking and item tracking; Tracking Specification (Table 336) supports lot/serial lifecycle. TecSA's new tables are physical groundwork only, not complete BC behavioral parity.

## Current acceptance status

| Checkpoint | Status |
| --- | --- |
| GitHub backend physical schema committed | Yes — Part 3 development branch |
| Generic ApiSource declarations committed | Yes — 11 sources |
| Existing Core, bin ledgers and posting services preserved | No deliberate rewrite in Part 3 |
| Database migration executed | **Not yet** |
| Test suite / runtime API verified | **Not yet** |
| Reservation & tracking posting integration | **Not yet** |
| Warehouse Receipt/Shipment end-to-end workflow | **Not yet** |
| Posted warehouse history written through posting services | **Not yet** |
| Backend `main` merged | **No** |

See [Purchasing Part 1](/documentation/modules/purchasing-pr28-database), [Sales Part 2](/documentation/modules/sales-part2-database), [Table and API](/documentation/backend/table-and-api), and [Header and lines](/documentation/frontend/header-and-lines).

Backend source: [Part 3 checkpoint](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-inventory-warehouse-part3-20261103/docs/database/BC_INVENTORY_WAREHOUSE_PART3_CHECKPOINT.md). BC reference: [Warehouse management overview](https://learn.microsoft.com/en-us/dynamics365/business-central/design-details-warehouse-management), [Reservation Entry behavior](https://learn.microsoft.com/en-us/dynamics365/business-central/reservation-entry-table-features-that-update-the-table).
