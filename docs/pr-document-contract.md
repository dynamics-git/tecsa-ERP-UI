# Purchase Requisition document contract

## Current normal CRUD alignment — 7 November 2026

The Header stores `noSeriesCode` and `locationCode`; line master identity is
`lineType` + `number`, with `unitOfMeasureCode` and `locationCode`. The former
GUID field names are not part of this schema. Lookup searches and selected-value
reads use the published master source and business code/number.

A manual Header No. is required before draft creation. Automatic number assignment
is not implemented by the current generic PR source. The existing backend PR
Resources are reused by shared CRUD responses, including create/update, so the
existing `DocumentType` Enum supplies the caption after the record exists.
No client document-type value is fabricated for an unsaved editor.

Existing FactBox sections, actions and UI preview calculations remain in place.
Their deferred business aggregates/workflows are not completed by this correction.
Earlier test counts below are historical evidence, not acceptance of this change.

## Record identity and document relationship

`systemId` remains the API identity for reading, updating and deleting a record.
The PR line collection is `/purchaseRequisitionLines`. The page explicitly matches:

- Header `number` to line `documentNumber`.
- Header `documentType` to line `documentType`.

The optional shared `parentFieldMap` maps child API field names to header response field names. Existing `lineFKProp`, `headerPKProp`, fixed fields and navigation configuration remain supported. Missing mapped values prevent child creation. No document-type constant is supplied by the frontend.

```ts
dataSource: {
  endpoint: '/purchaseRequisitionLines',
  keyField: 'systemId',
  headerPKProp: 'number',
  lineFKProp: 'documentNumber',
  parentFieldMap: { documentType: 'documentType' },
  invalidates: ['/purchaseRequisitions'],
  defaultSort: 'lineNo asc',
}
```

The header displays read-only `documentTypeLabel`. The raw `documentType` is retained in header data for relationships. Neither the caption nor document type is written by the header form. Line writes invalidate cached header aggregates through the existing `invalidates` override.

## Backend dependency

The matching backend must return both `documentType` and `documentTypeLabel`, and support the independent line collection and record routes. A database migration alone does not update an API server. Do not substitute a frontend constant when the API omits the type.

## Verification and limits

The shared naming correction passed all 437 UI tests across 50 files. The full
run used two workers to avoid machine-load timeouts; the tests and assertions
were unchanged. Focused PR authoring, background-save and field-contract checks
also passed. Import and style guardrails passed. Browser visual review remains
pending; automated component checks are not a claim of manual visual review.

This is an implementation note, not the complete partner SDK manual. The requested comprehensive developer PDF remains outstanding.
