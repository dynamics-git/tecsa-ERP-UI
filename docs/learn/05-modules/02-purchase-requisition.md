# Purchase Requisition development map

PR is the document-page reference: browse list, header form, related line grid, domain commands and FactBox. Its business workflow remains separate from generic CRUD.

## Page structure

The list shows document number, dates, purpose, status and summary values. Opening one record uses its API identity. The header describes document type, number, dates and purpose. Lines bind document number and document type to their header.

## Relationship

The header business field is `number`; the child business field is `documentNumber`. `parentFieldMap` supplies `documentType`. Each saved line also has its own `systemId` for editing/deleting that line and a business `lineNo` for line ordering.

Do not replace the relation with the header's system ID just because the record endpoint uses an ID. The database must enforce the business relationship designed for the document.

## Entry and calculation

Lookups select item/account-related values through the declared field contract. Defaults are evaluated for each new record. Shared validation and field autosave handle ordinary entry. Calculation and footer config describe presentation totals; backend rules enforce valid quantities, costs and persisted business results.

## Workflow actions

Submit, Approve and Reject are domain commands with state requirements. They are different from PATCHing an arbitrary status value. Core displays the configured actions and executes their API action contract; backend business logic checks transitions and permissions.

## Record features

The FactBox shows requisition details, progress, Notes and Files through shared context. Loading a document with no lines should retain a stable grid and finish as an empty result, not loop because a reported total disagrees.

## Worked config

The [PR source example](/documentation/examples/purchase-requisition) includes the current config directly. Use that as the reference when building another document page. Keep the new module's business rules in its own backend behavior and page TS only where needed; do not copy PR-only special cases into shared core.
