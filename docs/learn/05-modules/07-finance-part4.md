# Finance & General Ledger Part 4 — developer and consultant guide

**Status:** This article documents the initial Finance Part 4 backend schema changes, **not a completed rollout**. Backend branch: `schema/bc-aligned-finance-part4-20261103`. PostgreSQL migrations and runtime acceptance **have not been run**. Neither backend `main` nor Company data has been migrated by this work.

## Phase A extension: Check Ledger and Bank Account Ledger

The integrated Phase A backend branch now includes `2026_11_03_000401_create_check_ledger_entries.php` and `2026_11_03_000402_complete_bank_account_ledger_fields.php`, using actual **Microsoft Base Application 26.1** Table 272 (Check Ledger Entry) and 271 (Bank Account Ledger Entry) symbol field definitions.

- `check_ledger_entries` keeps Company/SystemId identity, increasing `entry_no`, Bank Account identity, Check No./Date, Amount, Status, Statement provenance, void/exchange references and optional WHT/PDC fields. It references its Bank Account Ledger Entry by both the Company-scoped SystemId and entry number, with composite identity consistency.
- `ledger_sequences.next_check_ledger_entry_no` is a Company-specific sequence counter, not a shared global source.
- `bank_account_ledger_entries` gains persisted normal fields including Open, Positive, Remaining Amount, Debit/Credit amounts in document currency and LCY, Closed By Entry No. and Statement Status. BC-calculated FlowFields are not duplicated in the database.
- `checkLedgerEntries` is a **read-only** schema-derived API under the existing bank ledger permission resource. Issuing/printing/clearing/voiding checks must be done through domain operations in the later implementation phase, not generic CRUD.

**Current work remains Phase A physical schema only.** No runtime posting/check printing, no migration, no merge into backend `main`. Manufacturing/Job/Project modules are deferred.

## Existing modules and physical tables

| Functional area | Existing physical tables | Consultant meaning |
|---|---|---|
| G/L posting | `gl_registers`, `gl_entries` | Posted ledger register and individual accounting entries |
| VAT accounting | `vat_entries` | Posted VAT transaction history |
| Receivables | `customer_ledger_entries`, `customer_detailed_ledger_entries` | Customer subledger and application history |
| Payables | `vendor_ledger_entries`, `vendor_detailed_ledger_entries` | Vendor subledger and application history |
| Cash and banking | `bank_account_ledger_entries` | Posted cash/bank ledger |
| Bank Reconciliation | `bank_reconciliations`, `bank_reconciliation_lines`, `bank_reconciliation_matches` | Working bank statement matching |
| Posted Bank Reconciliation | `posted_bank_reconciliations`, `posted_bank_reconciliation_lines`, `posted_bank_reconciliation_matches` | Completed reconciliation history |

Existing general journal templates, batches, lines and posting setup remain intact. Part 4 does **not** create a second G/L, VAT or reconciliation engine.

## New backend migration

`2026_11_03_000400_complete_bank_finance_history_fields.php` adds *optional physical provenance fields* to three existing tables:

| Table | New field families |
|---|---|
| `bank_account_ledger_entries` | Document date, statement number/line, payment reference, reversal history, global dimensions, journal audit |
| `bank_reconciliation_lines` | Transaction/value date, bank reference, external document, statement/applied amounts, currency context |
| `posted_bank_reconciliation_lines` | Posted snapshots of bank reference, transaction/value dates and financial context |

The migration skips columns that already exist. Existing transaction amounts and entry keys are not rewritten. It deliberately avoids treating calculated remaining/open balances as independent writable storage.

## Developer implementation contract

**SystemId:** `system_id` is the technical record identity; `company_id` controls Company scope. Journal line numbers and ledger `entry_no` values are business/sequence fields, not substitutes for record identity.

**API ownership:** Core already publishes `glEntries`, `vatEntries` and `bankAccountLedgerEntries` as **read-only** sources. Do not create duplicate generic CRUD endpoints that bypass financial posting controls. Use the existing posting and application services for commands.

**UI:** Read the backend schema/API metadata before configuring List pages, filters, lookups or report actions. Reuse the shared Angular components. The new nullable fields can support consultant reporting once posting/backfill behavior has been verified; a field's existence is not proof it is populated.

**Test checkpoint:** `FinancePart4SchemaCheckpointTest` checks the existing ledger/reconciliation physical tables, field availability and read-only source permissions. It has been committed but **not executed**.

## Consultant workflow and limitations

- **General Journal:** Journal Template → Batch → Journal Lines → Post → G/L Register and Entries, with relevant Customer/Vendor/Bank/VAT entries.
- **Bank Reconciliation:** Select Bank Account → Import or enter statement lines → Match ledger transactions → Post reconciliation → Posted history.
- **Bank audit:** Use document numbers, bank references, dates, transaction numbers and source audit fields for reconciliation. Never change posted entry amounts directly to make a statement balance.
- **Reporting:** Historical rows may have NULL in newly added fields. This is not evidence that the original document lacked that information; population and historical-data policy still need acceptance.

## Release status

| Checkpoint | Status |
|---|---|
| Part 4 schema code committed | Yes |
| New G/L or bank posting engine created | No |
| Existing ledger APIs preserved | Yes, read-only |
| PostgreSQL migration executed | **No** |
| Runtime API/Company-schema tests | **Not yet** |
| Full Finance module accepted | **No** |
| Backend `main` merged | **No** |

See [Table and API](/documentation/backend/table-and-api), [Purchasing Part 1](/documentation/modules/purchasing-pr28-database), [Sales Part 2](/documentation/modules/sales-part2-database) and [Inventory & Warehouse Part 3](/documentation/modules/inventory-warehouse-part3).

[Backend Finance Part 4 checkpoint](https://github.com/dynamics-git/tecsa-erp-26.0/blob/schema/bc-aligned-finance-part4-20261103/docs/database/BC_FINANCE_PART4_CHECKPOINT.md).
